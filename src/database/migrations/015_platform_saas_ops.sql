CREATE TABLE IF NOT EXISTS platform_invoices (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  subscription_id CHAR(36) NULL,
  invoice_no VARCHAR(80) NOT NULL UNIQUE,
  amount_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  due_date DATE NULL,
  paid_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_platform_invoices_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
  CONSTRAINT fk_platform_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES gym_subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX idx_platform_invoices_gym ON platform_invoices (gym_id);
CREATE INDEX idx_platform_invoices_status ON platform_invoices (status);

CREATE TRIGGER trg_platform_invoices_updated_at
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS platform_payments (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  invoice_id CHAR(36) NULL,
  amount_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
  method VARCHAR(30) NOT NULL DEFAULT 'manual',
  txn_ref VARCHAR(120) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'paid',
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_platform_payments_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
  CONSTRAINT fk_platform_payments_invoice FOREIGN KEY (invoice_id) REFERENCES platform_invoices(id) ON DELETE SET NULL
);

CREATE INDEX idx_platform_payments_gym ON platform_payments (gym_id);
CREATE INDEX idx_platform_payments_invoice ON platform_payments (invoice_id);

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id CHAR(36) PRIMARY KEY,
  actor_user_id CHAR(36) NOT NULL,
  target_user_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  reason VARCHAR(255) NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  CONSTRAINT fk_impersonation_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_impersonation_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_impersonation_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE INDEX idx_impersonation_actor ON impersonation_sessions (actor_user_id);
CREATE INDEX idx_impersonation_gym ON impersonation_sessions (gym_id);

CREATE TABLE IF NOT EXISTS platform_issue_notes (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NULL,
  actor_user_id CHAR(36) NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_platform_issue_notes_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL,
  CONSTRAINT fk_platform_issue_notes_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_platform_issue_notes_gym ON platform_issue_notes (gym_id);
CREATE INDEX idx_platform_issue_notes_status ON platform_issue_notes (status);

CREATE TRIGGER trg_platform_issue_notes_updated_at
  BEFORE UPDATE ON platform_issue_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS usage_limits (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  metric_key VARCHAR(80) NOT NULL,
  limit_value INT NOT NULL DEFAULT 0,
  used_value INT NOT NULL DEFAULT 0,
  reset_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_usage_limit_gym_metric UNIQUE (gym_id, metric_key),
  CONSTRAINT fk_usage_limits_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_usage_limits_updated_at
  BEFORE UPDATE ON usage_limits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();