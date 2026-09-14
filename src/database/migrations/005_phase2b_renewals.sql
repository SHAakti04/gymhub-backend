ALTER TABLE renewals
  ADD COLUMN plan_name VARCHAR(100) NULL,
  ADD COLUMN amount DECIMAL(12,2) NULL,
  ADD COLUMN payment_method VARCHAR(20) NULL,
  ADD COLUMN upi_txn_ref VARCHAR(120) NULL,
  ADD COLUMN payment_note TEXT NULL,
  ADD COLUMN submitted_at DATETIME NULL,
  ADD COLUMN reviewed_by_user_id CHAR(36) NULL,
  ADD COLUMN reviewed_at DATETIME NULL,
  ADD COLUMN reject_reason VARCHAR(255) NULL;