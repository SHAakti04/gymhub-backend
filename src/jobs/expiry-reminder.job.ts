import type { RowDataPacket } from "mysql2";
import { query } from "../config/db.js";
import { logger } from "../config/logger.js";
import { whatsappService } from "../modules/whatsapp/whatsapp.service.js";

export async function runExpiryReminderJob() {
  const gyms = await query<RowDataPacket[]>(
    "SELECT id, name FROM gyms WHERE status = 'active' ORDER BY created_at ASC",
  );

  let queued = 0;

  for (const gym of gyms) {
    const result = await whatsappService.runExpiryCampaign(gym.id, gym.name || "MyGym");
    queued += result.queued;
  }

  logger.info({ gyms: gyms.length, queued }, "Expiry reminder job executed");
}