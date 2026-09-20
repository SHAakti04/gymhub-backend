import { AppError } from "../../common/errors/app-error.js";
import { whatsappRepository } from "../whatsapp/whatsapp.repository.js";
import { churnRepository, type ChurnMetricRow, type PersistedChurnScore } from "./churn.repository.js";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildRiskScore(row: ChurnMetricRow): PersistedChurnScore {
  const daysSinceVisit = row.days_since_visit ?? 90;
  const visitsLast7d = Number(row.visits_last_7d ?? 0);
  const visitsLast30d = Number(row.visits_last_30d ?? 0);

  let score = 0;

  score += Math.min(daysSinceVisit, 30) * 2;
  score += Math.max(0, 8 - visitsLast7d) * 4;
  score += Math.max(0, 12 - visitsLast30d) * 2;

  if (!row.last_visit) {
    score = 95;
  }

  const normalized = clampScore(score);
  const riskBand =
    normalized >= 70 ? "high" : normalized >= 40 ? "medium" : "low";

  return {
    memberId: row.member_id,
    gymId: row.gym_id,
    score: normalized,
    riskBand,
    daysSinceVisit,
    visitsLast7d,
    visitsLast30d,
    reasonJson: JSON.stringify({
      daysSinceVisit,
      visitsLast7d,
      visitsLast30d,
      noVisitHistory: !row.last_visit,
    }),
  };
}

export const churnService = {
  async refreshGym(gymId: string) {
    const metrics = await churnRepository.getMemberMetrics(gymId);
    const scores = (metrics as ChurnMetricRow[]).map(buildRiskScore);
    const result = await churnRepository.replaceScoresForGym(gymId, scores);

    return {
      gymId,
      members: result.members,
    };
  },

  async refreshAllGyms() {
    const gyms = await churnRepository.listActiveGyms();
    let totalMembers = 0;

    for (const gym of gyms) {
      const result = await this.refreshGym(gym.id);
      totalMembers += result.members;
    }

    return {
      gyms: gyms.length,
      members: totalMembers,
    };
  },

  async members(gymId: string) {
    const rows = await churnRepository.listMembers(gymId);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      plan: row.plan ?? "Member",
      score: Number(row.score),
      risk: row.risk_band,
      visits30d: Number(row.visits_last_30d ?? 0),
      visits7d: Number(row.visits_last_7d ?? 0),
      daysSinceVisit: Number(row.days_since_visit ?? 999),
      lastVisit:
        Number(row.days_since_visit ?? 999) === 0
          ? "Today"
          : `${Number(row.days_since_visit ?? 999)}d ago`,
      trend:
        Number(row.days_since_visit ?? 999) > 14
          ? "declining"
          : Number(row.days_since_visit ?? 999) > 5
            ? "stable"
            : "improving",
      calculatedAt: row.calculated_at,
    }));
  },

  async summary(gymId: string) {
    const rows = await churnRepository.getSummary(gymId);

    return {
      high: Number(rows.find((row) => row.risk_band === "high")?.total ?? 0),
      medium: Number(rows.find((row) => row.risk_band === "medium")?.total ?? 0),
      low: Number(rows.find((row) => row.risk_band === "low")?.total ?? 0),
    };
  },

  async absenceReminders(gymId: string) {
    return churnRepository.listAbsenceReminders(gymId);
  },

  async reengageMember(gymId: string, memberId: string) {
    const member = await churnRepository.getMemberForReengage(memberId, gymId);

    if (!member) {
      throw new AppError(404, "NOT_FOUND", "Member not found");
    }

    if (!member.phone) {
      throw new AppError(400, "VALIDATION_ERROR", "Member phone number is missing");
    }

    await whatsappRepository.queueBroadcast({
      gymId,
      phone: member.phone,
      campaign: "manual-reengage",
      message: `Hi ${member.name}, we miss you at MyGym. Your ${member.plan_name ?? "membership"} plan is waiting for you. Reply or visit the gym to restart strong.`,
    });

    return { queued: true };
  },
};