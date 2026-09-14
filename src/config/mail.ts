import { resolve4 } from "node:dns/promises";
// import nodemailer, { type Transporter } from "nodemailer";
import nodemailer, { type Transporter } from "nodemailer";
// import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "./env.js";
import { logger } from "./logger.js";

let transporterPromise: Promise<Transporter | null> | null = null;

function smtpConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM_EMAIL);
}

async function resolveSmtpHost() {
  if (!env.SMTP_HOST || !env.SMTP_RESOLVE_IPV4) {
    return env.SMTP_HOST;
  }

  try {
    const addresses = await resolve4(env.SMTP_HOST);
    const resolvedHost = addresses[0] ?? env.SMTP_HOST;

    logger.info({ smtpHost: env.SMTP_HOST, resolvedHost }, "Resolved SMTP host through IPv4");

    return resolvedHost;
  } catch (error) {
    logger.warn({ error, smtpHost: env.SMTP_HOST }, "Could not resolve SMTP IPv4 address, falling back to hostname");

    return env.SMTP_HOST;
  }
}

async function getTransporter() {
  if (!smtpConfigured()) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = resolveSmtpHost().then((resolvedHost) => {
      if (!resolvedHost) return null;

      const transportOptions = {
        host: resolvedHost,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        family: env.SMTP_FORCE_IPV4 ? 4 : undefined,
        connectionTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
        greetingTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
        socketTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
        tls: {
          servername: env.SMTP_HOST,
          rejectUnauthorized: !env.SMTP_ALLOW_SELF_SIGNED,
        },
      };

      return nodemailer.createTransport(transportOptions as any);
    });
  }

  return transporterPromise;
}

function fromAddress() {
  if (!env.SMTP_FROM_EMAIL) return undefined;

  return env.SMTP_FROM_NAME
    ? `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`
    : env.SMTP_FROM_EMAIL;
}

export async function verifyMailConnection() {
  const transporter = await getTransporter();

  if (!transporter || !env.SMTP_FROM_EMAIL) {
    return { ok: false, skipped: true, reason: "SMTP is not configured" };
  }

  await transporter.verify();
  return { ok: true, skipped: false };
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = await getTransporter();

  if (!transporter || !env.SMTP_FROM_EMAIL) {
    logger.warn({ to: input.to, subject: input.subject }, "SMTP not configured. Email skipped.");
    return { skipped: true };
  }

  const info = await transporter.sendMail({
    from: fromAddress(),
    replyTo: env.SMTP_REPLY_TO_EMAIL || env.SMTP_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return { skipped: false, messageId: info.messageId };
}