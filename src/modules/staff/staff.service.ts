import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sendMail } from "../../config/mail.js";
import { staffRepository, type StaffInput } from "./staff.repository.js";

function makeTempPassword() {
  return randomBytes(24)
    .toString("base64url")
    .slice(0, env.MEMBER_TEMP_PASSWORD_LENGTH);
}

function staffCredentialsEmail(input: { name: string; email: string; password: string }) {
  return `
    <h2>Welcome to MyGym Staff Portal</h2>
    <p>Hi ${input.name}, your staff account is ready.</p>
    <p><b>Login URL:</b> <a href="${env.APP_LOGIN_URL}">${env.APP_LOGIN_URL}</a></p>
    <p><b>Email:</b> ${input.email}</p>
    <p><b>Temporary Password:</b> ${input.password}</p>
    <p>Please login and change your password after first login.</p>
  `;
}

export const staffService = {
  list(gymId: string) {
    return staffRepository.list(gymId);
  },

  publicTrainers(gymId = "nagpur") {
    return staffRepository.publicTrainers(gymId);
  },

  async create(gymId: string, input: StaffInput) {
    const password = makeTempPassword();
    const email = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);

    const created = await staffRepository.create(gymId, {
      ...input,
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      passwordHash,
    });

    let credentialEmailStatus: "sent" | "skipped" | "failed" = "sent";

    try {
      const mail = await sendMail({
        to: email,
        subject: "Your MyGym Staff Login Credentials",
        html: staffCredentialsEmail({
          name: input.name.trim(),
          email,
          password,
        }),
        text: `Welcome to MyGym Staff Portal. Login: ${env.APP_LOGIN_URL}\nEmail: ${email}\nTemporary password: ${password}`,
      });

      credentialEmailStatus = mail.skipped ? "skipped" : "sent";
    } catch (mailError) {
      credentialEmailStatus = "failed";
      logger.error({ mailError, to: email, staffId: created?.id }, "Staff credential email failed");
    }

    return { ...created, credentialEmailStatus };
  },

  async update(id: string, gymId: string, input: Partial<StaffInput>) {
    const staff = await staffRepository.update(id, gymId, input);
    if (!staff) {
      throw new AppError(404, "STAFF_NOT_FOUND", "Staff member not found");
    }
    return staff;
  },
};