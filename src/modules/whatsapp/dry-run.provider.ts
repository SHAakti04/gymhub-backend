import type { WhatsAppProvider } from "./whatsapp.types.js";

export class DryRunWhatsAppProvider implements WhatsAppProvider {
  async getStatus() {
    return {
      connected: true,
      status: "dry_run",
      message: "Dry-run mode is enabled. No real WhatsApp messages will be sent."
    };
  }

  async sendText(input: { to: string; message: string }) {
    return {
      providerMessageId: `dry_${Date.now()}`,
      raw: {
        dryRun: true,
        to: input.to,
        message: input.message
      }
    };
  }
}