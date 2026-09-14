import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { sendMail } from "../../config/mail.js";
import { logger } from "../../config/logger.js";
import { membersRepository } from "./members.repository.js";

function makeTempPassword() {
  return randomBytes(24)
    .toString("base64url")
    .slice(0, env.MEMBER_TEMP_PASSWORD_LENGTH);
}
function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultExpiryForPlan(planName: string) {
  const normalized = planName.toLowerCase();
  const months =
    normalized.includes("year") || normalized.includes("annual")
      ? 12
      : normalized.includes("quarter")
        ? 3
        : normalized.includes("half")
          ? 6
          : 1;

  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + months);
  return dateOnly(expiry);
}
function credentialsEmail(input: {
  name: string;
  email: string;
  password: string;
}) {
  return `
    <h2>Welcome to MyGym</h2>
    <p>Hi ${input.name}, your member account is ready.</p>
    <p><b>Login URL:</b> <a href="${env.APP_LOGIN_URL}">${env.APP_LOGIN_URL}</a></p>
    <p><b>Email:</b> ${input.email}</p>
    <p><b>Temporary Password:</b> ${input.password}</p>
    <p>Please login and change your password after first login.</p>
  `;
}

export const membersService = {
  async listMembers(input: {
    gymId: string | null;
    isSuper: boolean;
    page?: number | string;
    limit?: number | string;
  }) {
    return membersRepository.listMembers(input);
  },

  async createMember(input: {
    gymId: string;
    fullName: string;
    email: string;
    phone: string;
    planName: string;
    amount?: number;
    method?: "cash" | "upi" | "card";
    expiryDate?: string;
    notes?: string;
  }) {
    const password = makeTempPassword();
    const normalizedInput = {
      ...input,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      planName: input.planName.trim(),
      expiryDate: input.expiryDate?.trim() || defaultExpiryForPlan(input.planName),
      notes: input.notes?.trim(),
    };

    try {
      const created = await membersRepository.createMember({
        ...normalizedInput,
        password,
      });

      let credentialEmailStatus: "sent" | "skipped" | "failed" = "sent";

      try {
        const mail = await sendMail({
          to: normalizedInput.email,
          subject: "Your MyGym Member Login Credentials",
          html: credentialsEmail({
            name: normalizedInput.fullName,
            email: normalizedInput.email,
            password,
          }),
          text: `Welcome to MyGym. Login: ${env.APP_LOGIN_URL}\nEmail: ${normalizedInput.email}\nTemporary password: ${password}`,
        });

        credentialEmailStatus = mail.skipped ? "skipped" : "sent";
      } catch (mailError) {
        credentialEmailStatus = "failed";
        logger.error(
          { mailError, to: normalizedInput.email, memberId: created.memberId },
          "Credential email failed, but member account was created",
        );
      }

      await membersRepository.auditCredentials({
        userId: created.userId,
        memberId: created.memberId,
        gymId: normalizedInput.gymId,
        email: normalizedInput.email,
        actionName: "member_created",
        status: credentialEmailStatus,
      });

      return { ...created, credentialEmailStatus };
    } catch (error: any) {
      if (error?.code === "EMAIL_ALREADY_EXISTS") {
        throw new AppError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "An account with this email already exists",
        );
      }
      throw error;
    }
  },
  async findMemberByEmail(input: { gymId: string; email: string }) {
    return membersRepository.getMemberByEmail(input);
  },
    async resetMemberPassword(memberId: string) {
    const member = await membersRepository.getMemberById(memberId);
    if (!member) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
    }

    const password = makeTempPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = await membersRepository.updateMemberPassword({
      memberId,
      passwordHash,
    });

    if (!userId) {
      throw new AppError(404, "MEMBER_USER_NOT_FOUND", "Member user account not found");
    }

    let credentialEmailStatus: "sent" | "skipped" | "failed" = "sent";

    try {
      const mail = await sendMail({
        to: member.email,
        subject: "Your MyGym Member Login Credentials",
        html: credentialsEmail({
          name: member.full_name,
          email: member.email,
          password,
        }),
        text: `Welcome to MyGym. Login: ${env.APP_LOGIN_URL}\nEmail: ${member.email}\nTemporary password: ${password}`,
      });

      credentialEmailStatus = mail.skipped ? "skipped" : "sent";
    } catch (mailError) {
      credentialEmailStatus = "failed";
      logger.error(
        { mailError, to: member.email, memberId },
        "Credential reset email failed",
      );
    }

    await membersRepository.auditCredentials({
      userId,
      memberId,
      gymId: member.gym_id,
      email: member.email,
      actionName: "password_reset",
      status: credentialEmailStatus,
    });

    return { memberId, credentialEmailStatus };
  },
  async getMember(memberId: string) {
    const member = await membersRepository.getMemberById(memberId);
    if (!member)
      throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
    return member;
  },

  async updateMember(
    memberId: string,
    payload: Partial<{
      fullName: string;
      phone: string;
      status: string;
      planName: string;
      expiryDate: string;
    }>,
  ) {
    const member = await membersRepository.updateMember(memberId, payload);
    if (!member)
      throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
    return member;
  },

  async getMemberAttendance(memberId: string) {
    return membersRepository.getMemberAttendance(memberId);
  },

  async getMemberPayments(memberId: string) {
    return membersRepository.getMemberPayments(memberId);
  },

  async getMemberReceipts(memberId: string) {
    return membersRepository.getMemberReceipts(memberId);
  },
};
