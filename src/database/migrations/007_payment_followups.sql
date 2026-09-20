CREATE TABLE IF NOT EXISTS payment_followups (
  id CHAR(36) PRIMARY KEY,
  payment_id CHAR(36) NOT NULL UNIQUE,
  gym_id VARCHAR(64) NOT NULL,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  auto_reminder BOOLEAN NOT NULL DEFAULT FALSE,
  last_reminder_at TIMESTAMP NULL,
  follow_up VARCHAR(20) NOT NULL DEFAULT 'none',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_followups_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_followups_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_payment_followups_updated_at
  BEFORE UPDATE ON payment_followups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();