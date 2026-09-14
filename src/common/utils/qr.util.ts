import { hashValue } from "./crypto.util.js";
import { istDateKey } from "./date.util.js";

export function makeDailyQrCode(gymId: string, date = istDateKey()) {
  const seed = `${gymId}:${date}`;
  return `GYM-${gymId}-${date.replace(/-/g, "")}-${hashValue(seed).slice(0, 8).toUpperCase()}`;
}