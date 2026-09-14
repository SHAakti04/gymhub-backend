CREATE TABLE IF NOT EXISTS gym_payment_settings (
  gym_id VARCHAR(64) PRIMARY KEY,
  upi_id VARCHAR(120) NULL,
  payee_name VARCHAR(150) NULL,
  qr_image_url TEXT NULL,
  instructions TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_settings_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

ALTER TABLE member_join_requests
  ADD COLUMN upi_txn_ref VARCHAR(120) NULL,
  ADD COLUMN payment_note TEXT NULL,
  ADD COLUMN payment_submitted_at DATETIME NULL;