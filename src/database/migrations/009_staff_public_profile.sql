ALTER TABLE staff
  ADD COLUMN avatar_url VARCHAR(500) NULL,
  ADD COLUMN specialty VARCHAR(120) NULL,
  ADD COLUMN public_bio TEXT NULL,
  ADD COLUMN experience_years INT NULL,
  ADD COLUMN certifications VARCHAR(500) NULL,
  ADD COLUMN instagram VARCHAR(120) NULL;