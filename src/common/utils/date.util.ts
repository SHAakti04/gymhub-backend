import { env } from "../../config/env.js";

export function istDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: env.TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function istTimeKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: env.TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function nowIso() {
  return new Date().toISOString();
}