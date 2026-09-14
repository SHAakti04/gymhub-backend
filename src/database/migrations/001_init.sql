CREATE TABLE IF NOT EXISTS gyms (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  owner_name VARCHAR(120),
  owner_email VARCHAR(255),
  plan_name VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO roles (id, name) VALUES
('00000000-0000-0000-0000-000000000001', 'super'),
('00000000-0000-0000-0000-000000000002', 'admin'),
('00000000-0000-0000-0000-000000000003', 'staff'),
('00000000-0000-0000-0000-000000000004', 'member');

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_role (user_id, role_id),
  CONSTRAINT fk_ura_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ura_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS members (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  gym_id VARCHAR(64) NOT NULL,
  plan_name VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  join_date DATE,
  expiry_date DATE,
  age INT NULL,
  gender VARCHAR(8) NULL,
  emergency_contact VARCHAR(30) NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_members_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staff (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  gym_id VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  role_name VARCHAR(50) NOT NULL,
  salary DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  join_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  duration_months INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plans_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id CHAR(36) PRIMARY KEY,
  member_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  attendance_date DATE NOT NULL,
  check_in_time VARCHAR(8) NOT NULL,
  check_out_time VARCHAR(8) NULL,
  qr_code VARCHAR(120) NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'camera',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_member_day (member_id, attendance_date),
  CONSTRAINT fk_attendance_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_qr_codes (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  qr_date DATE NOT NULL,
  code VARCHAR(120) NOT NULL,
  generated_by_user_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gym_qr_date (gym_id, qr_date),
  CONSTRAINT fk_daily_qr_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY,
  member_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  plan_name VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  paid_at DATETIME NOT NULL,
  txn_ref VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS receipts (
  id CHAR(36) PRIMARY KEY,
  payment_id CHAR(36) NOT NULL UNIQUE,
  member_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  receipt_no VARCHAR(100) NOT NULL UNIQUE,
  issued_at DATETIME NOT NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_receipts_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS renewals (
  id CHAR(36) PRIMARY KEY,
  member_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reminder_sent_at DATETIME NULL,
  renewed_payment_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_renewals_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staff_rosters (
  id CHAR(36) PRIMARY KEY,
  staff_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  roster_date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rosters_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll_entries (
  id CHAR(36) PRIMARY KEY,
  staff_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  month_key VARCHAR(7) NOT NULL,
  method VARCHAR(20) NOT NULL,
  txn_ref VARCHAR(100) NULL,
  notes TEXT NULL,
  paid_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payroll_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cashflow_entries (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  entry_type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  entry_date DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cashflow_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leads (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255) NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'trial_form',
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  distance_km DECIMAL(10,2) NULL,
  consent_given TINYINT(1) NOT NULL DEFAULT 0,
  consent_at DATETIME NULL,
  consent_ip VARCHAR(64) NULL,
  consent_user_agent VARCHAR(500) NULL,
  ref_code VARCHAR(50) NULL,
  ref_by VARCHAR(100) NULL,
  notes TEXT NULL,
  meta_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_leads_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lead_consent_audit (
  id CHAR(36) PRIMARY KEY,
  lead_id CHAR(36) NULL,
  phone VARCHAR(30) NULL,
  action_name VARCHAR(50) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_referrals (
  id CHAR(36) PRIMARY KEY,
  referrer_member_id CHAR(36) NULL,
  lead_id CHAR(36) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reward_points INT NOT NULL DEFAULT 0,
  reward_credited TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS broadcast_logs (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  lead_id CHAR(36) NULL,
  phone VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  campaign VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  consent_verified TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nearby_businesses (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  external_place_id VARCHAR(120) NULL,
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(80) NULL,
  phone VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  distance_km DECIMAL(10,2) NULL,
  rating DECIMAL(3,2) NULL,
  partnership_status VARCHAR(30) NOT NULL DEFAULT 'prospect',
  notes TEXT NULL,
  fetched_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS churn_scores (
  id CHAR(36) PRIMARY KEY,
  member_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  score INT NOT NULL,
  risk_band VARCHAR(20) NOT NULL,
  days_since_visit INT NOT NULL DEFAULT 0,
  visits_last_7d INT NOT NULL DEFAULT 0,
  visits_last_30d INT NOT NULL DEFAULT 0,
  reason_json JSON NULL,
  calculated_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS absence_reminders (
  id CHAR(36) PRIMARY KEY,
  member_id CHAR(36) NOT NULL,
  gym_id VARCHAR(64) NOT NULL,
  reminder_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  provider VARCHAR(30) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NULL,
  recipient_phone VARCHAR(30) NOT NULL,
  template_name VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL,
  provider VARCHAR(30) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  member_id CHAR(36) NULL,
  title VARCHAR(150) NOT NULL,
  goal VARCHAR(100) NULL,
  content_json JSON NOT NULL,
  created_by_user_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  image_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_assets (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id CHAR(36) NULL,
  public_id VARCHAR(255) NOT NULL,
  secure_url TEXT NOT NULL,
  media_type VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_bookings (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  member_id CHAR(36) NOT NULL,
  class_name VARCHAR(150) NOT NULL,
  starts_at DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'booked',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offers (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  discount_pct DECIMAL(5,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  applies_to VARCHAR(20) NOT NULL DEFAULT 'all',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competitions (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  prize VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competition_participants (
  id CHAR(36) PRIMARY KEY,
  competition_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  score DECIMAL(10,2) NOT NULL DEFAULT 0,
  joined_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NULL,
  user_id CHAR(36) NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NULL,
  user_id CHAR(36) NULL,
  action_name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id CHAR(36) NULL,
  payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);