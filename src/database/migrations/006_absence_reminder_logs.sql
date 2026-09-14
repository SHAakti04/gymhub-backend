ALTER TABLE absence_reminders
  ADD COLUMN motivation TEXT NULL,
  ADD COLUMN recipient_email VARCHAR(255) NULL,
  ADD COLUMN email_status VARCHAR(20) NOT NULL DEFAULT 'queued';

ALTER TABLE absence_reminders
  ADD UNIQUE KEY uq_absence_member_date (member_id, reminder_date);