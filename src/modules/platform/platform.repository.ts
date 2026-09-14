import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query, withTransaction } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export interface OnboardGymInput {
  gymId: string;
  name: string;
  slug: string;
  city?: string | null;
  state?: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  planId: string;
  billingCycle: "monthly" | "annual";
  passwordHash: string;
  brandColor?: string | null;
  accentColor?: string | null;
}

function normalizePlanFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

export const platformRepository = {
  async audit(input: {
    actorUserId?: string | null;
    gymId?: string | null;
    actionName: string;
    entityType: string;
    entityId?: string | null;
    payload?: unknown;
  }) {
    await query<ResultSetHeader>(
      `
      INSERT INTO platform_audit_logs
        (id, actor_user_id, gym_id, action_name, entity_type, entity_id, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))
      `,
      [
        makeId(),
        input.actorUserId ?? null,
        input.gymId ?? null,
        input.actionName,
        input.entityType,
        input.entityId ?? null,
        JSON.stringify(input.payload ?? {}),
      ],
    );
  },

  async dashboard() {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT
        COUNT(*) AS totalGyms,
        SUM(CASE WHEN g.status = 'active' THEN 1 ELSE 0 END) AS activeGyms,
        SUM(CASE WHEN g.status = 'suspended' THEN 1 ELSE 0 END) AS suspendedGyms,
        SUM(CASE WHEN gs.status = 'trial' THEN 1 ELSE 0 END) AS trialGyms,
        SUM(CASE WHEN gs.status = 'trial' AND gs.trial_ends_at BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS trialsEndingSoon,
        COALESCE(SUM(CASE WHEN gs.status IN ('active','trial') THEN gs.price_inr ELSE 0 END), 0) AS mrr,
        COALESCE(SUM(CASE WHEN pi.status IN ('open','overdue') THEN pi.amount_inr ELSE 0 END), 0) AS overdueAmount
      FROM gyms g
      LEFT JOIN gym_subscriptions gs ON gs.gym_id = g.id
      LEFT JOIN platform_invoices pi ON pi.gym_id = g.id
      `,
    );

    return rows[0];
  },

  async listGyms() {
    return query<RowDataPacket[]>(
      `
      SELECT
        g.id,
        g.name,
        g.slug,
        g.city,
        g.state,
        g.owner_name,
        g.owner_email,
        g.status,
        g.brand_color,
        g.accent_color,
        g.logo_url,
        g.created_at,
        gs.plan_id,
        gs.status AS subscription_status,
        gs.billing_cycle,
        gs.price_inr,
        gs.trial_ends_at,
        gs.current_period_end,
        sp.name AS plan_name,
        COUNT(DISTINCT m.id) AS member_count,
        COUNT(DISTINCT s.id) AS staff_count
      FROM gyms g
      LEFT JOIN gym_subscriptions gs ON gs.gym_id = g.id
      LEFT JOIN saas_plans sp ON sp.id = gs.plan_id
      LEFT JOIN members m ON m.gym_id = g.id
      LEFT JOIN staff s ON s.gym_id = g.id
      GROUP BY g.id, gs.id, sp.id
      ORDER BY g.created_at DESC
      `,
    );
  },

  async updateGym(input: {
    actorUserId: string | null;
    gymId: string;
    name?: string;
    slug?: string;
    city?: string | null;
    state?: string | null;
    ownerName?: string;
    ownerEmail?: string;
    brandColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
  }) {
    await query<ResultSetHeader>(
      `
      UPDATE gyms
      SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        city = ?,
        state = ?,
        owner_name = COALESCE(?, owner_name),
        owner_email = COALESCE(?, owner_email),
        brand_color = ?,
        accent_color = ?,
        logo_url = ?
      WHERE id = ?
      `,
      [
        input.name ?? null,
        input.slug ?? null,
        input.city ?? null,
        input.state ?? null,
        input.ownerName ?? null,
        input.ownerEmail ?? null,
        input.brandColor ?? null,
        input.accentColor ?? null,
        input.logoUrl ?? null,
        input.gymId,
      ],
    );

    await this.audit({
      actorUserId: input.actorUserId,
      gymId: input.gymId,
      actionName: "gym_updated",
      entityType: "gym",
      entityId: input.gymId,
      payload: input,
    });

    const rows = await query<RowDataPacket[]>(`SELECT * FROM gyms WHERE id = ? LIMIT 1`, [input.gymId]);
    return rows[0] ?? null;
  },

  async listPlans() {
    return query<RowDataPacket[]>(`SELECT * FROM saas_plans ORDER BY monthly_inr ASC`);
  },

  async createPlan(input: {
    id: string;
    name: string;
    tier: string;
    monthlyInr: number;
    annualInr: number;
    maxMembers: number;
    maxStaff: number;
    whatsappMonthlyQuota: number;
    aiMonthlyQuota: number;
    features: string[];
    isActive: boolean;
  }) {
    await query<ResultSetHeader>(
      `
      INSERT INTO saas_plans
        (id, name, tier, monthly_inr, annual_inr, max_members, max_staff,
         whatsapp_monthly_quota, ai_monthly_quota, features_json, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
      `,
      [
        input.id,
        input.name,
        input.tier,
        input.monthlyInr,
        input.annualInr,
        input.maxMembers,
        input.maxStaff,
        input.whatsappMonthlyQuota,
        input.aiMonthlyQuota,
        JSON.stringify(input.features),
        input.isActive ? 1 : 0,
      ],
    );

    return this.findPlan(input.id);
  },

  async updatePlan(planId: string, input: Partial<{
    name: string;
    tier: string;
    monthlyInr: number;
    annualInr: number;
    maxMembers: number;
    maxStaff: number;
    whatsappMonthlyQuota: number;
    aiMonthlyQuota: number;
    features: string[];
    isActive: boolean;
  }>) {
    await query<ResultSetHeader>(
      `
      UPDATE saas_plans
      SET
        name = COALESCE(?, name),
        tier = COALESCE(?, tier),
        monthly_inr = COALESCE(?, monthly_inr),
        annual_inr = COALESCE(?, annual_inr),
        max_members = COALESCE(?, max_members),
        max_staff = COALESCE(?, max_staff),
        whatsapp_monthly_quota = COALESCE(?, whatsapp_monthly_quota),
        ai_monthly_quota = COALESCE(?, ai_monthly_quota),
        features_json = COALESCE(CAST(? AS JSON), features_json),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
      `,
      [
        input.name ?? null,
        input.tier ?? null,
        input.monthlyInr ?? null,
        input.annualInr ?? null,
        input.maxMembers ?? null,
        input.maxStaff ?? null,
        input.whatsappMonthlyQuota ?? null,
        input.aiMonthlyQuota ?? null,
        input.features ? JSON.stringify(input.features) : null,
        typeof input.isActive === "boolean" ? (input.isActive ? 1 : 0) : null,
        planId,
      ],
    );

    return this.findPlan(planId);
  },

  async listFeatures() {
    return query<RowDataPacket[]>(`SELECT * FROM feature_registry ORDER BY name ASC`);
  },

  async createFeature(input: {
    featureKey: string;
    name: string;
    description?: string | null;
    defaultEnabled: boolean;
  }) {
    await query<ResultSetHeader>(
      `
      INSERT INTO feature_registry (feature_key, name, description, default_enabled)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        default_enabled = VALUES(default_enabled)
      `,
      [input.featureKey, input.name, input.description ?? null, input.defaultEnabled ? 1 : 0],
    );

    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM feature_registry WHERE feature_key = ? LIMIT 1`,
      [input.featureKey],
    );

    return rows[0] ?? null;
  },

  async listGymFeatures(gymId: string) {
    return query<RowDataPacket[]>(
      `
      SELECT
        fr.feature_key,
        fr.name,
        fr.description,
        fr.default_enabled,
        COALESCE(gff.enabled, fr.default_enabled) AS enabled
      FROM feature_registry fr
      LEFT JOIN gym_feature_flags gff
        ON gff.feature_key = fr.feature_key
        AND gff.gym_id = ?
      ORDER BY fr.name ASC
      `,
      [gymId],
    );
  },

  async setGymFeature(input: {
    actorUserId: string | null;
    gymId: string;
    featureKey: string;
    enabled: boolean;
  }) {
    await query<ResultSetHeader>(
      `
      INSERT INTO gym_feature_flags (id, gym_id, feature_key, enabled)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = NOW()
      `,
      [makeId(), input.gymId, input.featureKey, input.enabled ? 1 : 0],
    );

    await this.audit({
      actorUserId: input.actorUserId,
      gymId: input.gymId,
      actionName: "feature_flag_updated",
      entityType: "feature",
      entityId: input.featureKey,
      payload: { enabled: input.enabled },
    });

    return this.listGymFeatures(input.gymId);
  },

  async findPlan(planId: string) {
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM saas_plans WHERE id = ? LIMIT 1`,
      [planId],
    );
    return rows[0] ?? null;
  },

  async emailExists(email: string) {
    const rows = await query<RowDataPacket[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    return Boolean(rows[0]);
  },

  async gymExists(gymId: string) {
    const rows = await query<RowDataPacket[]>(`SELECT id FROM gyms WHERE id = ? LIMIT 1`, [gymId]);
    return Boolean(rows[0]);
  },

  async onboardGym(input: OnboardGymInput) {
    return withTransaction(async (connection) => {
      const userId = makeId();
      const subscriptionId = makeId();

      const [roleRows] = await connection.query<RowDataPacket[]>(`SELECT id FROM roles WHERE name = 'admin' LIMIT 1`);
      const adminRoleId = roleRows[0]?.id as string | undefined;
      if (!adminRoleId) throw new Error("Admin role is not configured");

      const [planRows] = await connection.query<RowDataPacket[]>(`SELECT * FROM saas_plans WHERE id = ? LIMIT 1`, [input.planId]);
      const plan = planRows[0];
      if (!plan) throw new Error("SaaS plan not found");

      const price = input.billingCycle === "annual" ? Number(plan.annual_inr) : Number(plan.monthly_inr);

      await connection.query<ResultSetHeader>(
        `
        INSERT INTO gyms
          (id, name, slug, city, state, owner_name, owner_email, plan_name, status,
           monthly_fee, subscription_status, trial_ends_at, brand_color, accent_color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 'trial', DATE_ADD(CURDATE(), INTERVAL 14 DAY), ?, ?)
        `,
        [
          input.gymId,
          input.name,
          input.slug,
          input.city ?? null,
          input.state ?? null,
          input.ownerName,
          input.ownerEmail,
          input.planId,
          Number(plan.monthly_inr),
          input.brandColor ?? "18 100% 60%",
          input.accentColor ?? "222 73% 33%",
        ],
      );

      await connection.query<ResultSetHeader>(
        `
        INSERT INTO users (id, gym_id, email, password_hash, full_name, phone, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        [userId, input.gymId, input.ownerEmail, input.passwordHash, input.ownerName, input.ownerPhone ?? null],
      );

      await connection.query<ResultSetHeader>(
        `INSERT INTO user_role_assignments (id, user_id, role_id) VALUES (?, ?, ?)`,
        [makeId(), userId, adminRoleId],
      );

      await connection.query<ResultSetHeader>(
        `
        INSERT INTO gym_subscriptions
          (id, gym_id, plan_id, status, billing_cycle, price_inr, started_at, trial_ends_at, current_period_end)
        VALUES (?, ?, ?, 'trial', ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
        `,
        [subscriptionId, input.gymId, input.planId, input.billingCycle, price],
      );

      const features = normalizePlanFeatures(plan.features_json);
      for (const feature of features) {
        await connection.query<ResultSetHeader>(
          `
          INSERT INTO gym_feature_flags (id, gym_id, feature_key, enabled)
          VALUES (?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE enabled = 1
          `,
          [makeId(), input.gymId, feature],
        );
      }

      await connection.query<ResultSetHeader>(
        `
        INSERT INTO platform_audit_logs
          (id, actor_user_id, gym_id, action_name, entity_type, entity_id, payload_json)
        VALUES (?, NULL, ?, 'gym_onboarded', 'gym', ?, JSON_OBJECT('ownerEmail', ?, 'planId', ?))
        `,
        [makeId(), input.gymId, input.gymId, input.ownerEmail, input.planId],
      );

      return { gymId: input.gymId, ownerUserId: userId, subscriptionId };
    });
  },

  async setGymStatus(gymId: string, status: "active" | "suspended", actorUserId?: string | null) {
    await query<ResultSetHeader>(
      `UPDATE gyms SET status = ?, subscription_status = ? WHERE id = ?`,
      [status, status === "suspended" ? "suspended" : "active", gymId],
    );

    await query<ResultSetHeader>(
      `UPDATE gym_subscriptions SET status = ? WHERE gym_id = ?`,
      [status === "suspended" ? "suspended" : "active", gymId],
    );

    await this.audit({
      actorUserId: actorUserId ?? null,
      gymId,
      actionName: status === "suspended" ? "gym_suspended" : "gym_reinstated",
      entityType: "gym",
      entityId: gymId,
      payload: { status },
    });

    return { gymId, status };
  },

  async getSubscription(gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT gs.*, sp.name AS plan_name, sp.features_json
      FROM gym_subscriptions gs
      LEFT JOIN saas_plans sp ON sp.id = gs.plan_id
      WHERE gs.gym_id = ?
      LIMIT 1
      `,
      [gymId],
    );

    return rows[0] ?? null;
  },

  async assignPlan(input: {
    actorUserId: string | null;
    gymId: string;
    planId: string;
    billingCycle: "monthly" | "annual";
    status: string;
  }) {
    const plan = await this.findPlan(input.planId);
    const price = input.billingCycle === "annual" ? Number(plan?.annual_inr ?? 0) : Number(plan?.monthly_inr ?? 0);

    await query<ResultSetHeader>(
      `
      INSERT INTO gym_subscriptions
        (id, gym_id, plan_id, status, billing_cycle, price_inr, started_at, current_period_end)
      VALUES (?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
      ON DUPLICATE KEY UPDATE
        plan_id = VALUES(plan_id),
        status = VALUES(status),
        billing_cycle = VALUES(billing_cycle),
        price_inr = VALUES(price_inr),
        current_period_end = VALUES(current_period_end),
        updated_at = NOW()
      `,
      [makeId(), input.gymId, input.planId, input.status, input.billingCycle, price],
    );

    await query<ResultSetHeader>(
      `UPDATE gyms SET plan_name = ?, monthly_fee = ?, subscription_status = ? WHERE id = ?`,
      [input.planId, Number(plan?.monthly_inr ?? price), input.status, input.gymId],
    );

    await this.audit({
      actorUserId: input.actorUserId,
      gymId: input.gymId,
      actionName: "plan_assigned",
      entityType: "subscription",
      entityId: input.gymId,
      payload: input,
    });

    return this.getSubscription(input.gymId);
  },

  async updateSubscription(input: {
    actorUserId: string | null;
    gymId: string;
    status?: string;
    billingCycle?: "monthly" | "annual";
    priceInr?: number;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
  }) {
    await query<ResultSetHeader>(
      `
      UPDATE gym_subscriptions
      SET
        status = COALESCE(?, status),
        billing_cycle = COALESCE(?, billing_cycle),
        price_inr = COALESCE(?, price_inr),
        trial_ends_at = ?,
        current_period_end = ?
      WHERE gym_id = ?
      `,
      [
        input.status ?? null,
        input.billingCycle ?? null,
        input.priceInr ?? null,
        input.trialEndsAt ?? null,
        input.currentPeriodEnd ?? null,
        input.gymId,
      ],
    );

    if (input.status) {
      await query<ResultSetHeader>(
        `UPDATE gyms SET subscription_status = ? WHERE id = ?`,
        [input.status, input.gymId],
      );
    }

    await this.audit({
      actorUserId: input.actorUserId,
      gymId: input.gymId,
      actionName: "subscription_updated",
      entityType: "subscription",
      entityId: input.gymId,
      payload: input,
    });

    return this.getSubscription(input.gymId);
  },

  async listInvoices() {
    return query<RowDataPacket[]>(
      `
      SELECT pi.*, g.name AS gym_name
      FROM platform_invoices pi
      JOIN gyms g ON g.id = pi.gym_id
      ORDER BY pi.created_at DESC
      LIMIT 500
      `,
    );
  },

  async listPayments() {
    return query<RowDataPacket[]>(
      `
      SELECT pp.*, g.name AS gym_name, pi.invoice_no
      FROM platform_payments pp
      JOIN gyms g ON g.id = pp.gym_id
      LEFT JOIN platform_invoices pi ON pi.id = pp.invoice_id
      ORDER BY pp.paid_at DESC
      LIMIT 500
      `,
    );
  },

  async listUsers() {
    return query<RowDataPacket[]>(
      `
      SELECT
        u.id,
        u.gym_id,
        g.name AS gym_name,
        u.email,
        u.full_name,
        u.phone,
        u.is_active,
        GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') AS roles_csv,
        u.created_at
      FROM users u
      LEFT JOIN gyms g ON g.id = u.gym_id
      LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
      LEFT JOIN roles r ON r.id = ura.role_id
      GROUP BY u.id, g.id
      ORDER BY u.created_at DESC
      LIMIT 500
      `,
    );
  },

  async updateUserRoles(input: { actorUserId: string | null; userId: string; roles: string[] }) {
    return withTransaction(async (connection) => {
      const [roleRows] = await connection.query<RowDataPacket[]>(
        `SELECT id, name FROM roles WHERE name IN (?)`,
        [input.roles],
      );

      await connection.query<ResultSetHeader>(`DELETE FROM user_role_assignments WHERE user_id = ?`, [input.userId]);

      for (const role of roleRows) {
        await connection.query<ResultSetHeader>(
          `INSERT INTO user_role_assignments (id, user_id, role_id) VALUES (?, ?, ?)`,
          [makeId(), input.userId, role.id],
        );
      }

      await connection.query<ResultSetHeader>(
        `
        INSERT INTO platform_audit_logs
          (id, actor_user_id, action_name, entity_type, entity_id, payload_json)
        VALUES (?, ?, 'user_roles_updated', 'user', ?, CAST(? AS JSON))
        `,
        [makeId(), input.actorUserId, input.userId, JSON.stringify({ roles: input.roles })],
      );

      return { userId: input.userId, roles: input.roles };
    });
  },

  async findGymOwnerAdmin(gymId: string) {
    const rows = await query<RowDataPacket[]>(
      `
      SELECT
        u.id,
        u.gym_id,
        u.email,
        u.full_name,
        GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') AS roles_csv
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN roles r ON r.id = ura.role_id
      WHERE u.gym_id = ? AND r.name = 'admin' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY u.created_at ASC
      LIMIT 1
      `,
      [gymId],
    );

    return rows[0] ?? null;
  },

  async createImpersonationSession(input: {
    actorUserId: string;
    targetUserId: string;
    gymId: string;
    reason?: string | null;
  }) {
    const id = makeId();

    await query<ResultSetHeader>(
      `
      INSERT INTO impersonation_sessions (id, actor_user_id, target_user_id, gym_id, reason)
      VALUES (?, ?, ?, ?, ?)
      `,
      [id, input.actorUserId, input.targetUserId, input.gymId, input.reason ?? null],
    );

    await this.audit({
      actorUserId: input.actorUserId,
      gymId: input.gymId,
      actionName: "impersonation_started",
      entityType: "impersonation_session",
      entityId: id,
      payload: { targetUserId: input.targetUserId, reason: input.reason ?? null },
    });

    return { id };
  },

  async endImpersonationSession(input: { actorUserId: string; sessionId: string }) {
    await query<ResultSetHeader>(
      `UPDATE impersonation_sessions SET ended_at = NOW() WHERE id = ? AND actor_user_id = ? AND ended_at IS NULL`,
      [input.sessionId, input.actorUserId],
    );

    await this.audit({
      actorUserId: input.actorUserId,
      actionName: "impersonation_ended",
      entityType: "impersonation_session",
      entityId: input.sessionId,
      payload: {},
    });

    return { sessionId: input.sessionId, ended: true };
  },

  async listAudit() {
    return query<RowDataPacket[]>(
      `
      SELECT
        pal.*,
        u.email AS actor_email,
        g.name AS gym_name
      FROM platform_audit_logs pal
      LEFT JOIN users u ON u.id = pal.actor_user_id
      LEFT JOIN gyms g ON g.id = pal.gym_id
      ORDER BY pal.created_at DESC
      LIMIT 500
      `,
    );
  },

  async listSupportIssues() {
    return query<RowDataPacket[]>(
      `
      SELECT
        pin.*,
        g.name AS gym_name,
        u.email AS actor_email
      FROM platform_issue_notes pin
      LEFT JOIN gyms g ON g.id = pin.gym_id
      LEFT JOIN users u ON u.id = pin.actor_user_id
      ORDER BY pin.updated_at DESC
      LIMIT 500
      `,
    );
  },

  async createSupportIssue(input: {
    actorUserId: string | null;
    gymId?: string | null;
    title: string;
    body: string;
    status: string;
    priority: string;
  }) {
    const id = makeId();

    await query<ResultSetHeader>(
      `
      INSERT INTO platform_issue_notes
        (id, gym_id, actor_user_id, title, body, status, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        input.gymId ?? null,
        input.actorUserId,
        input.title,
        input.body,
        input.status,
        input.priority,
      ],
    );

    await this.audit({
      actorUserId: input.actorUserId,
      gymId: input.gymId ?? null,
      actionName: "support_issue_created",
      entityType: "support_issue",
      entityId: id,
      payload: { title: input.title, status: input.status, priority: input.priority },
    });

    const rows = await query<RowDataPacket[]>(`SELECT * FROM platform_issue_notes WHERE id = ? LIMIT 1`, [id]);
    return rows[0] ?? null;
  },
};