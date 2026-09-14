import Groq from "groq-sdk";
import { env } from "./env.js";

const groqClient = env.GROQ_API_KEY ? new Groq({ apiKey: env.GROQ_API_KEY }) : null;

export async function generateAiText(systemPrompt: string, userPrompt: string, fallback: string) {
  if (!groqClient) {
    return { provider: "fallback", content: fallback };
  }

  const completion = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return {
    provider: "groq",
    content: completion.choices[0]?.message?.content?.trim() || fallback
  };
}