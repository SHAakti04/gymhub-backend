import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { sendMail } from "../../config/mail.js";
import { logger } from "../../config/logger.js";
import { signAccessToken } from "../../config/auth.js";
import { platformRepository } from "./platform.repository.js";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function makeTempPassword() {
  return randomBytes(24).toString("base64url").slice(0, env.MEMBER_TEMP_PASSWORD_LENGTH);
}

export const platformService = {
  dashboard() {
    return platformRepository.dashboard();
  },

  listGyms() {
    return platformRepository.listGyms();
  },

  async updateGym(actorUserId: string | null, gymId: string, input: any) {
    const gymExists = await platformRepository.gymExists(gymId);
    if (!gymExists) throw new AppError(404, "GYM_NOT_FOUND", "Gym not found");

    return platformRepository.updateGym({
      actorUserId,
      gymId,
      name: input.name,
      slug: input.slug,
      city: input.city ?? null,
      state: input.state ?? null,
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      brandColor: input.brandColor ?? null,
      accentColor: input.accentColor ?? null,
      logoUrl: input.logoUrl ?? null,
    });
  },

  listPlans() {
    return platformRepository.listPlans();
  },

  async createPlan(input: any) {
    const planId = slugify(input.id || input.name);
    if (!planId) throw new AppError(400, "INVALID_PLAN_ID", "Plan ID could not be generated");

    const existing = await platformRepository.findPlan(planId);
    if (existing) throw new AppError(409, "PLAN_EXISTS", "Plan already exists");

    return platformRepository.createPlan({
      id: planId,
      name: input.name,
      tier: input.tier ?? planId,
      monthlyInr: Number(input.monthlyInr ?? 0),
      annualInr: Number(input.annualInr ?? 0),
      maxMembers: Number(input.maxMembers ?? 300),
      maxStaff: Number(input.maxStaff ?? 2),
      whatsappMonthlyQuota: Number(input.whatsappMonthlyQuota ?? 0),
      aiMonthlyQuota: Number(input.aiMonthlyQuota ?? 0),
      features: input.features ?? [],
      isActive: input.isActive ?? true,
    });
  },

  async updatePlan(planId: string, input: any) {
    const existing = await platformRepository.findPlan(planId);
    if (!existing) throw new AppError(404, "PLAN_NOT_FOUND", "Plan not found");

    return platformRepository.updatePlan(planId, {
      name: input.name,
      tier: input.tier,
      monthlyInr: input.monthlyInr === undefined ? undefined : Number(input.monthlyInr),
      annualInr: input.annualInr === undefined ? undefined : Number(input.annualInr),
      maxMembers: input.maxMembers === undefined ? undefined : Number(input.maxMembers),
      maxStaff: input.maxStaff === undefined ? undefined : Number(input.maxStaff),
      whatsappMonthlyQuota:
        input.whatsappMonthlyQuota === undefined ? undefined : Number(input.whatsappMonthlyQuota),
      aiMonthlyQuota: input.aiMonthlyQuota === undefined ? undefined : Number(input.aiMonthlyQuota),
      features: input.features,
      isActive: input.isActive,
    });
  },

  listFeatures() {
    return platformRepository.listFeatures();
  },

  createFeature(input: any) {
    return platformRepository.createFeature({
      featureKey: slugify(input.featureKey || input.name),
      name: input.name,
      description: input.description ?? null,
      defaultEnabled: input.defaultEnabled ?? true,
    });
  },

  listGymFeatures(gymId: string) {
    return platformRepository.listGymFeatures(gymId);
  },

  async setGymFeature(input: {
    actorUserId: string | null;
    gymId: string;
    featureKey: string;
    enabled: boolean;
  }) {
    const gymExists = await platformRepository.gymExists(input.gymId);
    if (!gymExists) throw new AppError(404, "GYM_NOT_FOUND", "Gym not found");

    return platformRepository.setGymFeature(input);
  },

  async onboardGym(input: {
    name: string;
    gymId?: string;
    slug?: string;
    city?: string;
    state?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string;
    planId: string;
    billingCycle?: "monthly" | "annual";
    brandColor?: string;
    accentColor?: string;
  }) {
    const ownerEmail = input.ownerEmail.trim().toLowerCase();
    const gymId = slugify(input.gymId || input.slug || input.name);
    const slug = slugify(input.slug || gymId);

    if (!gymId) throw new AppError(400, "INVALID_GYM_ID", "Gym ID could not be generated");

    const [emailExists, gymExists, plan] = await Promise.all([
      platformRepository.emailExists(ownerEmail),
      platformRepository.gymExists(gymId),
      platformRepository.findPlan(input.planId),
    ]);

    if (emailExists) throw new AppError(409, "EMAIL_EXISTS", "Owner email already exists");
    if (gymExists) throw new AppError(409, "GYM_EXISTS", "Gym ID already exists");
    if (!plan) throw new AppError(404, "PLAN_NOT_FOUND", "Selected SaaS plan was not found");

    const password = makeTempPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const created = await platformRepository.onboardGym({
      gymId,
      slug,
      name: input.name.trim(),
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      ownerName: input.ownerName.trim(),
      ownerEmail,
      ownerPhone: input.ownerPhone?.trim() || null,
      planId: input.planId,
      billingCycle: input.billingCycle ?? "monthly",
      passwordHash,
      brandColor: input.brandColor?.trim() || null,
      accentColor: input.accentColor?.trim() || null,
    });

    let credentialEmailStatus: "sent" | "skipped" | "failed" = "sent";

    try {
      const mail = await sendMail({
        to: ownerEmail,
        subject: "Your GymHub Admin Login Credentials",
        html: `
          <h2>Welcome to GymHub</h2>
          <p>Hi ${input.ownerName}, your gym admin account is ready.</p>
          <p><b>Gym:</b> ${input.name}</p>
          <p><b>Login URL:</b> <a href="${env.APP_LOGIN_URL}">${env.APP_LOGIN_URL}</a></p>
          <p><b>Email:</b> ${ownerEmail}</p>
          <p><b>Temporary Password:</b> ${password}</p>
          <p>Please login and change your password after first login.</p>
        `,
        text: `Welcome to GymHub\nGym: ${input.name}\nLogin: ${env.APP_LOGIN_URL}\nEmail: ${ownerEmail}\nTemporary password: ${password}`,
      });

      credentialEmailStatus = mail.skipped ? "skipped" : "sent";
    } catch (mailError) {
      credentialEmailStatus = "failed";
      logger.error({ mailError, ownerEmail, gymId }, "Gym owner credential email failed");
    }

    return { ...created, credentialEmailStatus };
  },

  setGymStatus(gymId: string, status: "active" | "suspended", actorUserId?: string | null) {
    return platformRepository.setGymStatus(gymId, status, actorUserId);
  },

  getSubscription(gymId: string) {
    return platformRepository.getSubscription(gymId);
  },

  async assignPlan(actorUserId: string | null, gymId: string, input: any) {
    const plan = await platformRepository.findPlan(input.planId);
    if (!plan) throw new AppError(404, "PLAN_NOT_FOUND", "Plan not found");

    return platformRepository.assignPlan({
      actorUserId,
      gymId,
      planId: input.planId,
      billingCycle: input.billingCycle ?? "monthly",
      status: input.status ?? "active",
    });
  },

  updateSubscription(actorUserId: string | null, gymId: string, input: any) {
    return platformRepository.updateSubscription({
      actorUserId,
      gymId,
      status: input.status,
      billingCycle: input.billingCycle,
      priceInr: input.priceInr === undefined ? undefined : Number(input.priceInr),
      trialEndsAt: input.trialEndsAt ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
    });
  },

  listInvoices() {
    return platformRepository.listInvoices();
  },

  listPayments() {
    return platformRepository.listPayments();
  },

  listUsers() {
    return platformRepository.listUsers();
  },

  updateUserRoles(actorUserId: string | null, userId: string, roles: string[]) {
    if (!roles.length) throw new AppError(400, "ROLES_REQUIRED", "At least one role is required");
    return platformRepository.updateUserRoles({ actorUserId, userId, roles });
  },

  async enterAsAdmin(actorUserId: string | null, gymId: string, reason?: string) {
    if (!actorUserId) throw new AppError(401, "AUTH_REQUIRED", "Super admin session is required");

    const ownerAdmin = await platformRepository.findGymOwnerAdmin(gymId);
    if (!ownerAdmin) throw new AppError(404, "OWNER_ADMIN_NOT_FOUND", "No owner admin found for this gym");

    const roles = ownerAdmin.roles_csv ? String(ownerAdmin.roles_csv).split(",") : ["admin"];
    const session = await platformRepository.createImpersonationSession({
      actorUserId,
      targetUserId: ownerAdmin.id,
      gymId,
      reason: reason ?? "Super admin support access",
    });

    const accessToken = signAccessToken({
      sub: ownerAdmin.id,
      email: ownerAdmin.email,
      gymId: ownerAdmin.gym_id,
      memberId: null,
      roles,
      primaryRole: roles[0] ?? "admin",
    });

    return {
      sessionId: session.id,
      accessToken,
      user: {
        id: ownerAdmin.id,
        email: ownerAdmin.email,
        name: ownerAdmin.full_name,
        gymId: ownerAdmin.gym_id,
        roles,
        primaryRole: roles[0] ?? "admin",
        impersonatedBy: actorUserId,
      },
    };
  },

  endImpersonation(actorUserId: string | null, sessionId: string) {
    if (!actorUserId) throw new AppError(401, "AUTH_REQUIRED", "Super admin session is required");
    return platformRepository.endImpersonationSession({ actorUserId, sessionId });
  },

  listAudit() {
    return platformRepository.listAudit();
  },

  listSupportIssues() {
    return platformRepository.listSupportIssues();
  },

  createSupportIssue(actorUserId: string | null, input: any) {
    return platformRepository.createSupportIssue({
      actorUserId,
      gymId: input.gymId ?? null,
      title: input.title,
      body: input.body,
      status: input.status ?? "open",
      priority: input.priority ?? "normal",
    });
  },
};