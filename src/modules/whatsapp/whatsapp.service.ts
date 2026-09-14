import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../common/errors/app-error.js";
import { getEvolutionProvider, getWhatsAppProvider } from "./whatsapp.provider.js";
import { whatsappRepository } from "./whatsapp.repository.js";
import type { QueuedBroadcast, WhatsAppTemplate } from "./whatsapp.types.js";

const defaultTemplates: WhatsAppTemplate[] = [
  {
    id: "tpl_expiry",
    campaign: "5-day-expiry",
    name: "5-Day Expiry Reminder",
    body: "Hi {{name}}, your MyGym {{plan}} plan expires in {{days}} days. Renew now or reply RENEW.",
    variables: ["name", "plan", "days"]
  },
  {
    id: "tpl_churn",
    campaign: "3-month-churn",
    name: "3-Month Churn Rejoin",
    body: "Missed you {{name}}. Come back to MyGym this week and restart strong. Reply JOIN.",
    variables: ["name"]
  },
  {
    id: "tpl_radius",
    campaign: "5km-radius",
    name: "5KM Radius Blast",
    body: "Hi {{name}}, MyGym is near you. Book your trial today: {{link}}",
    variables: ["name", "link"]
  }
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function fillTemplate(template: string, data: Record<string, string | number | null | undefined>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ""));
}

function shouldBlockBroadcast(row: QueuedBroadcast) {
  if (!row.consent_verified) return "blocked_no_consent";
  if (row.lead_id && !row.lead_consent_given) return "blocked_no_consent";
  if (row.lead_status === "opted_out") return "blocked_opted_out";
  return null;
}

export const whatsappService = {
  templates() {
    return defaultTemplates;
  },

  async status(gymId: string) {
    const provider = getWhatsAppProvider();
    const providerStatus = await provider.getStatus();
    const usedToday = await whatsappRepository.countSentToday();

    return {
      provider: env.WHATSAPP_DRY_RUN ? "dry_run" : env.WHATSAPP_PROVIDER,
      dryRun: env.WHATSAPP_DRY_RUN,
      instanceName: env.EVOLUTION_INSTANCE_NAME,
      dailyLimit: env.WHATSAPP_DAILY_LIMIT,
      usedToday,
      remainingToday: Math.max(env.WHATSAPP_DAILY_LIMIT - usedToday, 0),
      gymId,
      providerStatus
    };
  },

  async connectInstance() {
    if (env.WHATSAPP_DRY_RUN) {
      return {
        dryRun: true,
        message: "Dry-run mode is enabled. Disable WHATSAPP_DRY_RUN to connect Evolution API."
      };
    }

    return getEvolutionProvider().connect();
  },

  async logs(gymId: string) {
    return whatsappRepository.listLogs(gymId);
  },

  async dispatchQueued(limit = 10) {
    const providerName = env.WHATSAPP_DRY_RUN ? "dry_run" : env.WHATSAPP_PROVIDER;
    const provider = getWhatsAppProvider();
    const rows = await whatsappRepository.getQueuedBroadcasts(limit);
    const results: Array<{ id: string; status: string; reason?: string }> = [];

    for (const row of rows) {
      const blockedReason = shouldBlockBroadcast(row);
      if (blockedReason) {
        await whatsappRepository.markBroadcastStatus(row.id, blockedReason);
        await whatsappRepository.createWhatsAppLog({
          gymId: row.gym_id,
          phone: row.phone,
          templateName: row.campaign,
          status: blockedReason,
          provider: providerName,
          metadata: { broadcastId: row.id }
        });
        results.push({ id: row.id, status: blockedReason });
        continue;
      }

      const usedToday = await whatsappRepository.countSentToday();
      if (usedToday >= env.WHATSAPP_DAILY_LIMIT) {
        await whatsappRepository.markBroadcastStatus(row.id, "blocked_daily_limit");
        results.push({ id: row.id, status: "blocked_daily_limit" });
        continue;
      }

      await whatsappRepository.markBroadcastStatus(row.id, "sending");

      try {
        const sent = await provider.sendText({
          to: normalizePhone(row.phone),
          message: row.message
        });

        const finalStatus = env.WHATSAPP_DRY_RUN ? "dry_run" : "sent";

        await whatsappRepository.markBroadcastStatus(row.id, finalStatus, true);
        await whatsappRepository.createWhatsAppLog({
          gymId: row.gym_id,
          phone: row.phone,
          templateName: row.campaign,
          status: finalStatus,
          provider: providerName,
          metadata: {
            broadcastId: row.id,
            providerMessageId: sent.providerMessageId,
            raw: sent.raw
          }
        });

        results.push({ id: row.id, status: finalStatus });
      } catch (error) {
        logger.error({ error, broadcastId: row.id }, "WhatsApp send failed");
        await whatsappRepository.markBroadcastStatus(row.id, "failed");
        await whatsappRepository.createWhatsAppLog({
          gymId: row.gym_id,
          phone: row.phone,
          templateName: row.campaign,
          status: "failed",
          provider: providerName,
          metadata: {
            broadcastId: row.id,
            error: error instanceof Error ? error.message : String(error)
          }
        });
        results.push({ id: row.id, status: "failed" });
      }

      if (!env.WHATSAPP_DRY_RUN) {
        await sleep(env.WHATSAPP_SEND_DELAY_MS);
      }
    }

    return {
      processed: results.length,
      results
    };
  },

  async runExpiryCampaign(gymId: string, gymName: string) {
    const template = defaultTemplates.find((item) => item.campaign === "5-day-expiry");
    if (!template) throw new AppError(500, "TEMPLATE_MISSING", "Expiry template missing");

    const targets = await whatsappRepository.getExpiryTargets(gymId);

    for (const target of targets) {
      const days = target.expiry_date
        ? Math.max(0, Math.ceil((new Date(target.expiry_date).getTime() - Date.now()) / 86400000))
        : 5;

      await whatsappRepository.queueBroadcast({
        gymId,
        phone: target.phone,
        campaign: "5-day-expiry",
        message: fillTemplate(template.body, {
          name: target.name,
          plan: target.plan_name,
          amount: target.plan_amount,
          days,
          gym: gymName
        })
      });
    }

    return { queued: targets.length };
  },

  async runChurnCampaign(gymId: string, gymName: string) {
    const template = defaultTemplates.find((item) => item.campaign === "3-month-churn");
    if (!template) throw new AppError(500, "TEMPLATE_MISSING", "Churn template missing");

    const targets = await whatsappRepository.getChurnTargets(gymId);

    for (const target of targets) {
      await whatsappRepository.queueBroadcast({
        gymId,
        phone: target.phone,
        campaign: "3-month-churn",
        message: fillTemplate(template.body, {
          name: target.name,
          gym: gymName,
          days: target.days_since_visit
        })
      });
    }

    return { queued: targets.length };
  },

  async expiryTargets(gymId: string) {
    const rows = await whatsappRepository.getExpiryTargets(gymId);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      gymId: row.gym_id,
      type: "expiry",
      planExpiry: row.expiry_date,
      planAmount: Number(row.plan_amount ?? 0),
      planName: row.plan_name
    }));
  },

  async churnTargets(gymId: string) {
    const rows = await whatsappRepository.getChurnTargets(gymId);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      gymId: row.gym_id,
      type: "churn",
      lastVisit: row.last_visit,
      daysSinceVisit: Number(row.days_since_visit ?? 999)
    }));
  }
};