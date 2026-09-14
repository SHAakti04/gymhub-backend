import { createHash, randomUUID } from "node:crypto";

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function makeId() {
  return randomUUID();
}