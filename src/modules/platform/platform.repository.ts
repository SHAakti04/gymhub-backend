import { query, execute, withTransaction } from "../../config/db.js";
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
    await execute(
      `
      INSERT INTO platform_audit_logs
        (id, actor_user_id, gym_id, action_name, entity_type, entity_id, payload_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
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
    const rows = await query(
      `
      SELECT
        COUNT(*) AS totalGyms,
        SUM(CASE WHEN g.status = 'active' THEN 1 ELSE 0 END) AS activeGyms,
        SUM(CASE WHEN g.status = 'suspended' THEN 1 ELSE 0 END) AS suspendedGyms,
        SUM(CASE WHEN gs.status = 'trial' THEN 1 ELSE 0 END) AS trialGyms,
        SUM(CASE WHEN gs.status = 'trial' AND gs.trial_ends_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 ELSE 0 END) AS trialsEndingSoon,
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
    return query(
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
    await execute(
      `
      UPDATE gyms
      SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        city = $3,
        state = $4,
        owner_name = COALESCE($5, owner_name),
        owner_email = COALESCE($6, owner_email),
        brand_color = $7,
        accent_color = $8,
        logo_url = $9
      WHERE id = $10
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

    const rows = await query(`SELECT * FROM gyms WHERE id = $1 LIMIT 1`, [input.gymId]);
    return rows[0] ?? null;
  },

  async listPlans() {
    return query(`SELECT * FROM saas_plans ORDER BY monthly_inr ASC`);
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
    await execute(
      `
      INSERT INTO saas_plans
        (id, name, tier, monthly_inr, annual_inr, max_members, max_staff,
         whatsapp_monthly_quota, ai_monthly_quota, features_json, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        input.isActive,
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
    await execute(
      `
      UPDATE saas_plans
      SET
        name = COALESCE($1, name),
        tier = COALESCE($2, tier),
        monthly_inr = COALESCE($3, monthly_inr),
        annual_inr = COALESCE($4, annual_inr),
        max_members = COALESCE($5, max_members),
        max_staff = COALESCE($6, max_staff),
        whatsapp_monthly_quota = COALESCE($7, whatsapp_monthly_quota),
        ai_monthly_quota = COALESCE($8, ai_monthly_quota),
        features_json = COALESCE($9, features_json),
        is_active = COALESCE($10, is_active)
      WHERE id = $11
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
        input.isActive ?? null,
        planId,
      ],
    );

    return this.findPlan(planId);
  },

  async listFeatures() {
    return query(`SELECT * FROM feature_registry ORDER BY name ASC`);
  },

  async createFeature(input: {
    featureKey: string;
    name: string;
    description?: string | null;
    defaultEnabled: boolean;
  }) {
    await execute(
      `
      INSERT INTO feature_registry (feature_key, name, description, default_enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (feature_key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        default_enabled = EXCLUDED.default_enabled
      `,
      [input.featureKey, input.name, input.description ?? null, input.defaultEnabled],
    );

    const rows = await query(
      `SELECT * FROM feature_registry WHERE feature_key = $1 LIMIT 1`,
      [input.featureKey],
    );

    return rows[0] ?? null;
  },

  async listGymFeatures(gymId: string) {
    return query(
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
        AND gff.gym_id = $1
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
    await execute(
      `
      INSERT INTO gym_feature_flags (id, gym_id, feature_key, enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (gym_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()
      `,
      [makeId(), input.gymId, input.featureKey, input.enabled],
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
    const rows = await query(
      `SELECT * FROM saas_plans WHERE id = $1 LIMIT 1`,
      [planId],
    );
    return rows[0] ?? null;
  },

  async emailExists(email: string) {
    const rows = await query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
    return Boolean(rows[0]);
  },

  async gymExists(gymId: string) {
    const rows = await query(`SELECT id FROM gyms WHERE id = $1 LIMIT 1`, [gymId]);
    return Boolean(rows[0]);
  },

  async onboardGym(input: OnboardGymInput) {
    return withTransaction(async (connection) => {
      const userId = makeId();
      const subscriptionId = makeId();

      const roleResult = await connection.query(`SELECT id FROM roles WHERE name = 'admin' LIMIT 1`);
      const adminRoleId = roleResult.rows[0]?.id as string | undefined;
      if (!adminRoleId) throw new Error("Admin role is not configured");

      const planResult = await connection.query(`SELECT * FROM saas_plans WHERE id = $1 LIMIT 1`, [input.planId]);
      const plan = planResult.rows[0];
      if (!plan) throw new Error("SaaS plan not found");

      const price = input.billingCycle === "annual" ? Number(plan.annual_inr) : Number(plan.monthly_inr);

      await connection.query(
        `
        INSERT INTO gyms
          (id, name, slug, city, state, owner_name, owner_email, plan_name, status,
           monthly_fee, subscription_status, trial_ends_at, brand_color, accent_color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, 'trial', CURRENT_DATE + INTERVAL '14 days', $10, $11)
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

      await connection.query(
        `INSERT INTO users (id, gym_id, email, password_hash, full_name, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [userId, input.gymId, input.ownerEmail, input.passwordHash, input.ownerName, input.ownerPhone ?? null],
      );

      await connection.query(
        `INSERT INTO user_role_assignments (id, user_id, role_id) VALUES ($1, $2, $3)`,
        [makeId(), userId, adminRoleId],
      );

      await connection.query(
        `
        INSERT INTO gym_subscriptions
          (id, gym_id, plan_id, status, billing_cycle, price_inr, started_at, trial_ends_at, current_period_end)
        VALUES ($1, $2, $3, 'trial', $4, $5, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '1 month')
        `,
        [subscriptionId, input.gymId, input.planId, input.billingCycle, price],
      );

      const features = normalizePlanFeatures(plan.features_json);
      for (const feature of features) {
        await connection.query(
          `
          INSERT INTO gym_feature_flags (id, gym_id, feature_key, enabled)
          VALUES ($1, $2, $3, TRUE)
          ON CONFLICT (gym_id, feature_key) DO UPDATE SET enabled = TRUE
          `,
          [makeId(), input.gymId, feature],
        );
      }

      await connection.query(
        `
        INSERT INTO platform_audit_logs
          (id, actor_user_id, gym_id, action_name, entity_type, entity_id, payload_json)
        VALUES ($1, NULL, $2, 'gym_onboarded', 'gym', $3, $4)
        `,
        [makeId(), input.gymId, input.gymId, JSON.stringify({ ownerEmail: input.ownerEmail, planId: input.planId })],
      );

      return { gymId: input.gymId, ownerUserId: userId, subscriptionId };
    });
  },

  async setGymStatus(gymId: string, status: "active" | "suspended", actorUserId?: string | null) {
    await execute(
      `UPDATE gyms SET status = $1, subscription_status = $2 WHERE id = $3`,
      [status, status === "suspended" ? "suspended" : "active", gymId],
    );

    await execute(
      `UPDATE gym_subscriptions SET status = $1 WHERE gym_id = $2`,
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
    const rows = await query(
      `
      SELECT gs.*, sp.name AS plan_name, sp.features_json
      FROM gym_subscriptions gs
      LEFT JOIN saas_plans sp ON sp.id = gs.plan_id
      WHERE gs.gym_id = $1
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

    await execute(
      `
      INSERT INTO gym_subscriptions
        (id, gym_id, plan_id, status, billing_cycle, price_inr, started_at, current_period_end)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month')
      ON CONFLICT (gym_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        billing_cycle = EXCLUDED.billing_cycle,
        price_inr = EXCLUDED.price_inr,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
      `,
      [makeId(), input.gymId, input.planId, input.status, input.billingCycle, price],
    );

    await execute(
      `UPDATE gyms SET plan_name = $1, monthly_fee = $2, subscription_status = $3 WHERE id = $4`,
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
    await execute(
      `
      UPDATE gym_subscriptions
      SET
        status = COALESCE($1, status),
        billing_cycle = COALESCE($2, billing_cycle),
        price_inr = COALESCE($3, price_inr),
        trial_ends_at = $4,
        current_period_end = $5
      WHERE gym_id = $6
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
      await execute(
        `UPDATE gyms SET subscription_status = $1 WHERE id = $2`,
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
    return query(
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
    return query(
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
    return query(
      `
      SELECT
        u.id,
        u.gym_id,
        g.name AS gym_name,
        u.email,
        u.full_name,
        u.phone,
        u.is_active,
        string_agg(r.name, ',' ORDER BY r.name) AS roles_csv,
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
      const roleResult = await connection.query(
        `SELECT id, name FROM roles WHERE name = ANY($1)`,
        [input.roles],
      );
      const roleRows = roleResult.rows;

      await connection.query(`DELETE FROM user_role_assignments WHERE user_id = $1`, [input.userId]);

      for (const role of roleRows) {
        await connection.query(
          `INSERT INTO user_role_assignments (id, user_id, role_id) VALUES ($1, $2, $3)`,
          [makeId(), input.userId, role.id],
        );
      }

      await connection.query(
        `
        INSERT INTO platform_audit_logs
          (id, actor_user_id, action_name, entity_type, entity_id, payload_json)
        VALUES ($1, $2, 'user_roles_updated', 'user', $3, $4)
        `,
        [makeId(), input.actorUserId, input.userId, JSON.stringify({ roles: input.roles })],
      );

      return { userId: input.userId, roles: input.roles };
    });
  },

  async findGymOwnerAdmin(gymId: string) {
    const rows = await query(
      `
      SELECT
        u.id,
        u.gym_id,
        u.email,
        u.full_name,
        string_agg(r.name, ',' ORDER BY r.name) AS roles_csv
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN roles r ON r.id = ura.role_id
      WHERE u.gym_id = $1 AND r.name = 'admin' AND u.is_active = TRUE
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

    await execute(
      `
      INSERT INTO impersonation_sessions (id, actor_user_id, target_user_id, gym_id, reason)
      VALUES ($1, $2, $3, $4, $5)
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
    await execute(
      `UPDATE impersonation_sessions SET ended_at = NOW() WHERE id = $1 AND actor_user_id = $2 AND ended_at IS NULL`,
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
    return query(
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
    return query(
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

    await execute(
      `
      INSERT INTO platform_issue_notes
        (id, gym_id, actor_user_id, title, body, status, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
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

    const rows = await query(`SELECT * FROM platform_issue_notes WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] ?? null;
  },
};