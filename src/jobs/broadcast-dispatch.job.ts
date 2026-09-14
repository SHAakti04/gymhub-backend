import { logger } from "../config/logger.js";
import { whatsappService } from "../modules/whatsapp/whatsapp.service.js";

export async function runBroadcastDispatchJob() {
  const result = await whatsappService.dispatchQueued(10);
  logger.info({ result }, "Broadcast dispatch job executed");
}