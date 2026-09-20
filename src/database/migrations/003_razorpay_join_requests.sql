ALTER TABLE member_join_requests
  ADD COLUMN razorpay_order_id VARCHAR(120) NULL,
  ADD COLUMN razorpay_payment_id VARCHAR(120) NULL,
  ADD COLUMN razorpay_signature VARCHAR(255) NULL,
  ADD COLUMN rejected_by_user_id CHAR(36) NULL,
  ADD COLUMN rejected_at TIMESTAMP NULL,
  ADD COLUMN reject_reason VARCHAR(255) NULL;