import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import type { WhatsAppProvider } from "./whatsapp.types.js";

function cleanBaseUrl() {
  return env.EVOLUTION_API_URL.replace(/\/$/, "");
}

function requireApiKey() {
  if (!env.EVOLUTION_API_KEY) {
    throw new AppError(500, "EVOLUTION_API_KEY_MISSING", "Evolution API key is not configured");
  }

  return env.EVOLUTION_API_KEY;
}

export class EvolutionWhatsAppProvider implements WhatsAppProvider {
  async getStatus() {
    const response = await fetch(
      `${cleanBaseUrl()}/instance/connectionState/${env.EVOLUTION_INSTANCE_NAME}`,
      {
        headers: {
          apikey: requireApiKey()
        }
      }
    );

    if (!response.ok) {
      return {
        connected: false,
        status: "unknown",
        error: `Evolution API returned ${response.status}`
      };
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  async connect() {
    const response = await fetch(
      `${cleanBaseUrl()}/instance/connect/${env.EVOLUTION_INSTANCE_NAME}`,
      {
        headers: {
          apikey: requireApiKey()
        }
      }
    );

    if (!response.ok) {
      throw new AppError(502, "EVOLUTION_CONNECT_FAILED", "Could not connect Evolution instance");
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  async sendText(input: { to: string; message: string }) {
    const response = await fetch(
      `${cleanBaseUrl()}/message/sendText/${env.EVOLUTION_INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: requireApiKey()
        },
        body: JSON.stringify({
          number: input.to,
          text: input.message
        })
      }
    );

const raw = (await response.json().catch(() => ({}))) as {
  key?: { id?: string };
  messageId?: string;
};

    if (!response.ok) {
      throw new AppError(502, "EVOLUTION_SEND_FAILED", "Evolution API failed to send message", raw);
    }

    return {
      providerMessageId: raw?.key?.id ?? raw?.messageId ?? undefined,
      raw
    };
  }
}