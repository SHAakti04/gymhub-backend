CREATE TABLE IF NOT EXISTS gym_branding (
  gym_id VARCHAR(64) PRIMARY KEY,
  public_name VARCHAR(150) NULL,
  tagline VARCHAR(255) NULL,
  logo_url TEXT NULL,
  hero_image_url TEXT NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(255) NULL,
  address TEXT NULL,
  map_embed_url TEXT NULL,
  social_links_json TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gym_branding_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_gym_branding_updated_at
  BEFORE UPDATE ON gym_branding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS website_sections (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  section_key VARCHAR(80) NOT NULL,
  content_json TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_website_section UNIQUE (gym_id, section_key),
  CONSTRAINT fk_website_sections_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_website_sections_updated_at
  BEFORE UPDATE ON website_sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS website_gallery_images (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  title VARCHAR(150) NULL,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_website_gallery_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_website_gallery_images_updated_at
  BEFORE UPDATE ON website_gallery_images
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS website_programs (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  duration VARCHAR(50) NULL,
  level_name VARCHAR(50) NULL,
  icon_key VARCHAR(50) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_website_programs_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_website_programs_updated_at
  BEFORE UPDATE ON website_programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS website_pricing_plans (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  duration VARCHAR(50) NOT NULL DEFAULT 'month',
  features_json TEXT NOT NULL,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_website_pricing_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_website_pricing_plans_updated_at
  BEFORE UPDATE ON website_pricing_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS website_blog_posts (
  id CHAR(36) PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  excerpt TEXT NULL,
  body TEXT NULL,
  cover_image_url TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_website_blog_slug UNIQUE (gym_id, slug),
  CONSTRAINT fk_website_blog_gym FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_website_blog_posts_updated_at
  BEFORE UPDATE ON website_blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();