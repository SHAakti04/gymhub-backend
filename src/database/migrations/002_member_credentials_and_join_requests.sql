ALTER TABLE users
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN last_login_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS member_join_requests (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  goals TEXT NULL,
  approved_by_user_id CHAR(36) NULL,
  approved_at TIMESTAMP NULL,
  activated_member_id CHAR(36) NULL,
  credential_email_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_join_requests_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_member_join_requests_updated_at
  BEFORE UPDATE ON member_join_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS member_credentials_audit (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  action_name VARCHAR(50) NOT NULL,
  delivered_to_email VARCHAR(255) NOT NULL,
  delivery_status VARCHAR(30) NOT NULL,
  metadata_json TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_credentials_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_credentials_audit_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);