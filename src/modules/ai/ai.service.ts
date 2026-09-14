import { generateAiText } from "../../config/ai.js";

export const aiService = {
  async journeyInsights(input: { stage: string; memberContext: string }) {
    return generateAiText(
      "You are a gym-retention strategist. Give short operational recommendations.",
      `Stage: ${input.stage}\nContext: ${input.memberContext}`,
      "Follow up within 24 hours, offer a trial nudge, and focus on attendance consistency."
    );
  },

  async workoutGenerator(input: { goal: string; level: string; notes?: string }) {
    return generateAiText(
      "You are a fitness coach. Return a concise weekly workout outline.",
      `Goal: ${input.goal}\nLevel: ${input.level}\nNotes: ${input.notes ?? ""}`,
      "Day 1 Push, Day 2 Pull, Day 3 Legs, Day 4 Active recovery, Day 5 Full body conditioning."
    );
  },

  async marketingCopy(input: { campaignType: string; audience: string; offer: string }) {
    return generateAiText(
      "You write gym marketing copy. Keep it short, punchy, and mobile-friendly.",
      `Campaign type: ${input.campaignType}\nAudience: ${input.audience}\nOffer: ${input.offer}`,
      "Transform your routine with a limited-time gym offer. Book your trial today and feel the difference."
    );
  }
};