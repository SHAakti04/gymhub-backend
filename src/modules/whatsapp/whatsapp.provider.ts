import { env } from "../../config/env.js";
import { DryRunWhatsAppProvider } from "./dry-run.provider.js";
import { EvolutionWhatsAppProvider } from "./evolution.provider.js";
import type { WhatsAppProvider } from "./whatsapp.types.js";

export function getWhatsAppProvider(): WhatsAppProvider {
  if (env.WHATSAPP_DRY_RUN || env.WHATSAPP_PROVIDER === "dry_run") {
    return new DryRunWhatsAppProvider();
  }

  return new EvolutionWhatsAppProvider();
}

export function getEvolutionProvider() {
  return new EvolutionWhatsAppProvider();
}