ALTER TABLE renewals
  ADD COLUMN offer_code VARCHAR(50) NULL,
  ADD COLUMN offer_discount_pct DECIMAL(5,2) NULL,
  ADD COLUMN original_amount DECIMAL(12,2) NULL;

CREATE TABLE IF NOT EXISTS offer_redemptions (
  id CHAR(36) PRIMARY KEY,
  offer_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  member_id CHAR(36) NOT NULL,
  context_type VARCHAR(20) NOT NULL,
  context_id CHAR(36) NOT NULL,
  discount_pct DECIMAL(5,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL,
  redeemed_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_offer_redemptions_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  CONSTRAINT fk_offer_redemptions_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX idx_offer_redemptions_offer ON offer_redemptions (offer_id);
CREATE INDEX idx_offer_redemptions_member ON offer_redemptions (member_id);