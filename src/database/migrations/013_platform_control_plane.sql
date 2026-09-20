ALTER TABLE gyms
  ADD COLUMN slug VARCHAR(100) NULL,
  ADD COLUMN monthly_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN subscription_status VARCHAR(30) NOT NULL DEFAULT 'trial',
  ADD COLUMN trial_ends_at DATE NULL,
  ADD COLUMN brand_color VARCHAR(80) NULL,
  ADD COLUMN accent_color VARCHAR(80) NULL,
  ADD COLUMN logo_url TEXT NULL;

UPDATE gyms SET slug = id WHERE slug IS NULL OR slug = '';

CREATE TABLE IF NOT EXISTS saas_plans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  monthly_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
  annual_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_members INT NOT NULL DEFAULT 300,
  max_staff INT NOT NULL DEFAULT 2,
  whatsapp_monthly_quota INT NOT NULL DEFAULT 0,
  ai_monthly_quota INT NOT NULL DEFAULT 0,
  features_json TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_subscriptions (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL UNIQUE,
  plan_id VARCHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'trial',
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  price_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
  started_at DATE NOT NULL,
  trial_ends_at DATE NULL,
  current_period_end DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gym_subscriptions_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
  CONSTRAINT fk_gym_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES saas_plans(id)
);

CREATE TRIGGER trg_gym_subscriptions_updated_at
  BEFORE UPDATE ON gym_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS feature_registry (
  feature_key VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_feature_flags (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  feature_key VARCHAR(80) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_gym_feature UNIQUE (gym_id, feature_key),
  CONSTRAINT fk_gym_feature_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
  CONSTRAINT fk_gym_feature_registry FOREIGN KEY (feature_key) REFERENCES feature_registry(feature_key) ON DELETE CASCADE
);

CREATE TRIGGER trg_gym_feature_flags_updated_at
  BEFORE UPDATE ON gym_feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id CHAR(36) PRIMARY KEY,
  actor_user_id CHAR(36) NULL,
  gym_id VARCHAR(64) NULL,
  action_name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(100) NULL,
  payload_json TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO saas_plans
(id, name, tier, monthly_inr, annual_inr, max_members, max_staff, whatsapp_monthly_quota, ai_monthly_quota, features_json)
VALUES
('starter', 'Starter', 'starter', 5000, 50000, 300, 2, 500, 25, '["members","payments","attendance","reports"]'),
('growth', 'Growth', 'growth', 12000, 120000, 1000, 10, 3000, 150, '["members","payments","attendance","reports","staff","roster","payroll","cashflow","leads","whatsapp","churn"]'),
('enterprise', 'Enterprise', 'enterprise', 20000, 200000, 999999, 999, 15000, 1000, '["members","payments","attendance","reports","staff","roster","payroll","cashflow","leads","whatsapp","churn","products","offers","competitions","workouts","ai","branding"]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO feature_registry (feature_key, name, description, default_enabled)
VALUES
('members', 'Members', 'Member CRM and credentials', TRUE),
('payments', 'Payments', 'Payments, receipts, renewals', TRUE),
('attendance', 'Attendance', 'QR attendance and absence reminders', TRUE),
('reports', 'Reports', 'Revenue, growth, attendance reports', TRUE),
('staff', 'Staff', 'Staff profiles and credentials', TRUE),
('roster', 'Roster', 'Staff shift scheduling', TRUE),
('payroll', 'Payroll', 'Payroll and salary cashflow', TRUE),
('cashflow', 'Cashflow', 'Income and expense tracking', TRUE),
('leads', 'Leads', 'Lead capture and lead inbox', TRUE),
('whatsapp', 'WhatsApp', 'WhatsApp reminders and campaigns', TRUE),
('churn', 'Churn', 'Churn scoring and re-engagement', TRUE),
('products', 'Products', 'Product catalog and orders', TRUE),
('offers', 'Offers', 'Offers and redemptions', TRUE),
('competitions', 'Competitions', 'Gym competitions', TRUE),
('workouts', 'Workouts', 'Workout plans and logs', TRUE),
('ai', 'AI', 'AI workout and automation features', TRUE),
('branding', 'Branding', 'White-label gym branding', TRUE)
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO gym_subscriptions
(id, gym_id, plan_id, status, billing_cycle, price_inr, started_at, trial_ends_at, current_period_end)
SELECT
  gen_random_uuid()::text,
  g.id,
  COALESCE(g.plan_name, 'starter'),
  COALESCE(g.subscription_status, 'trial'),
  'monthly',
  CASE COALESCE(g.plan_name, 'starter')
    WHEN 'enterprise' THEN 20000
    WHEN 'growth' THEN 12000
    WHEN 'pro' THEN 12000
    ELSE 5000
  END,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '14 days',
  CURRENT_DATE + INTERVAL '1 month'
FROM gyms g
ON CONFLICT (gym_id) DO NOTHING;

INSERT INTO users
(id, gym_id, email, password_hash, full_name, phone, is_active)
VALUES
('00000000-0000-0000-0000-000000000099', NULL, 'super@gymhub.local',
 '$2b$10$206TLxWeijyIldgDeN..h.Z3GX7Wp4JnScPfBTF9pUQ1faystAU8a',
 'GymHub Super Admin', NULL, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_role_assignments (id, user_id, role_id)
VALUES
(gen_random_uuid()::text, '00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role_id) DO NOTHING;