CREATE TABLE IF NOT EXISTS gym_payment_settings (
  gym_id VARCHAR(64) PRIMARY KEY,
  upi_id VARCHAR(120) NULL,
  payee_name VARCHAR(150) NULL,
  qr_image_url TEXT NULL,
  instructions TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_settings_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_gym_payment_settings_updated_at
  BEFORE UPDATE ON gym_payment_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE member_join_requests
  ADD COLUMN upi_txn_ref VARCHAR(120) NULL,
  ADD COLUMN payment_note TEXT NULL,
  ADD COLUMN payment_submitted_at TIMESTAMP NULL;