import { query } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

const parseJson = (value: unknown, fallback: unknown) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

const normalizeBranding = (row: Record<string, unknown> | undefined | null) =>
  row
    ? {
        gymId: row.gym_id,
        publicName: row.public_name,
        tagline: row.tagline,
        logoUrl: row.logo_url,
        heroImageUrl: row.hero_image_url,
        phone: row.phone,
        email: row.email,
        address: row.address,
        mapEmbedUrl: row.map_embed_url,
        socialLinks: parseJson(row.social_links_json, {}),
      }
    : null;

const normalizeSection = (row: Record<string, unknown>) => ({
  id: row.id,
  gymId: row.gym_id,
  sectionKey: row.section_key,
  content: parseJson(row.content_json, {}),
});

const normalizeGallery = (row: Record<string, unknown>) => ({
  id: row.id,
  title: row.title,
  imageUrl: row.image_url,
  altText: row.alt_text,
  sortOrder: Number(row.sort_order ?? 0),
  isActive: Boolean(row.is_active),
});

const normalizeProgram = (row: Record<string, unknown>) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  duration: row.duration,
  levelName: row.level_name,
  iconKey: row.icon_key,
  sortOrder: Number(row.sort_order ?? 0),
  isActive: Boolean(row.is_active),
});

const normalizePricing = (row: Record<string, unknown>) => ({
  id: row.id,
  name: row.name,
  price: Number(row.price ?? 0),
  duration: row.duration,
  features: parseJson(row.features_json, []),
  isPopular: Boolean(row.is_popular),
  sortOrder: Number(row.sort_order ?? 0),
  isActive: Boolean(row.is_active),
});

const normalizeBlog = (row: Record<string, unknown>) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  excerpt: row.excerpt,
  body: row.body,
  coverImageUrl: row.cover_image_url,
  status: row.status,
  publishedAt: row.published_at,
});

export const websiteRepository = {
  async getBranding(gymId: string) {
    const rows = await query(
      "SELECT * FROM gym_branding WHERE gym_id = $1 LIMIT 1",
      [gymId],
    );
    return normalizeBranding(rows[0] as Record<string, unknown> | undefined);
  },

  async saveBranding(gymId: string, input: Record<string, unknown>) {
    await query(
      `INSERT INTO gym_branding
       (gym_id, public_name, tagline, logo_url, hero_image_url, phone, email, address, map_embed_url, social_links_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (gym_id) DO UPDATE SET
         public_name = EXCLUDED.public_name,
         tagline = EXCLUDED.tagline,
         logo_url = EXCLUDED.logo_url,
         hero_image_url = EXCLUDED.hero_image_url,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         address = EXCLUDED.address,
         map_embed_url = EXCLUDED.map_embed_url,
         social_links_json = EXCLUDED.social_links_json`,
      [
        gymId,
        input.publicName ?? null,
        input.tagline ?? null,
        input.logoUrl ?? null,
        input.heroImageUrl ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.address ?? null,
        input.mapEmbedUrl ?? null,
        JSON.stringify(input.socialLinks ?? {}),
      ],
    );

    return this.getBranding(gymId);
  },

  async listSections(gymId: string) {
    const rows = await query(
      "SELECT * FROM website_sections WHERE gym_id = $1 ORDER BY section_key",
      [gymId],
    );
    return rows.map((r) => normalizeSection(r as Record<string, unknown>));
  },

  async saveSection(gymId: string, sectionKey: string, content: unknown) {
    const id = makeId();
    await query(
      `INSERT INTO website_sections (id, gym_id, section_key, content_json)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (gym_id, section_key) DO UPDATE SET content_json = EXCLUDED.content_json`,
      [id, gymId, sectionKey, JSON.stringify(content ?? {})],
    );

    const rows = await query(
      "SELECT * FROM website_sections WHERE gym_id = $1 AND section_key = $2 LIMIT 1",
      [gymId, sectionKey],
    );
    return normalizeSection(rows[0] as Record<string, unknown>);
  },

  async listGallery(gymId: string, publicOnly = false) {
    const rows = await query(
      `SELECT * FROM website_gallery_images
       WHERE gym_id = $1 ${publicOnly ? "AND is_active = TRUE" : ""}
       ORDER BY sort_order ASC, created_at DESC`,
      [gymId],
    );
    return rows.map((r) => normalizeGallery(r as Record<string, unknown>));
  },

  async upsertGallery(gymId: string, input: Record<string, unknown>, id: string = makeId()) {
    await query(
      `INSERT INTO website_gallery_images (id, gym_id, title, image_url, alt_text, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         image_url = EXCLUDED.image_url,
         alt_text = EXCLUDED.alt_text,
         sort_order = EXCLUDED.sort_order,
         is_active = EXCLUDED.is_active`,
      [
        id,
        gymId,
        input.title ?? null,
        input.imageUrl,
        input.altText ?? null,
        input.sortOrder ?? 0,
        input.isActive !== false,
      ],
    );
    return (await this.listGallery(gymId)).find((row) => row.id === id) ?? null;
  },

  async deleteGallery(gymId: string, id: string) {
    await query("DELETE FROM website_gallery_images WHERE id = $1 AND gym_id = $2", [
      id,
      gymId,
    ]);
  },

  async listPrograms(gymId: string, publicOnly = false) {
    const rows = await query(
      `SELECT * FROM website_programs
       WHERE gym_id = $1 ${publicOnly ? "AND is_active = TRUE" : ""}
       ORDER BY sort_order ASC, created_at DESC`,
      [gymId],
    );
    return rows.map((r) => normalizeProgram(r as Record<string, unknown>));
  },

  async upsertProgram(gymId: string, input: Record<string, unknown>, id: string = makeId()) {
    await query(
      `INSERT INTO website_programs
       (id, gym_id, name, description, duration, level_name, icon_key, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         duration = EXCLUDED.duration,
         level_name = EXCLUDED.level_name,
         icon_key = EXCLUDED.icon_key,
         sort_order = EXCLUDED.sort_order,
         is_active = EXCLUDED.is_active`,
      [
        id,
        gymId,
        input.name,
        input.description ?? null,
        input.duration ?? null,
        input.levelName ?? null,
        input.iconKey ?? "Dumbbell",
        input.sortOrder ?? 0,
        input.isActive !== false,
      ],
    );
    return (await this.listPrograms(gymId)).find((row) => row.id === id) ?? null;
  },

  async deleteProgram(gymId: string, id: string) {
    await query("DELETE FROM website_programs WHERE id = $1 AND gym_id = $2", [
      id,
      gymId,
    ]);
  },

  async listPricing(gymId: string, publicOnly = false) {
    const rows = await query(
      `SELECT * FROM website_pricing_plans
       WHERE gym_id = $1 ${publicOnly ? "AND is_active = TRUE" : ""}
       ORDER BY sort_order ASC, created_at DESC`,
      [gymId],
    );
    return rows.map((r) => normalizePricing(r as Record<string, unknown>));
  },

  async upsertPricing(gymId: string, input: Record<string, unknown>, id: string = makeId()) {
    await query(
      `INSERT INTO website_pricing_plans
       (id, gym_id, name, price, duration, features_json, is_popular, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         price = EXCLUDED.price,
         duration = EXCLUDED.duration,
         features_json = EXCLUDED.features_json,
         is_popular = EXCLUDED.is_popular,
         sort_order = EXCLUDED.sort_order,
         is_active = EXCLUDED.is_active`,
      [
        id,
        gymId,
        input.name,
        input.price,
        input.duration ?? "month",
        JSON.stringify(input.features ?? []),
        Boolean(input.isPopular),
        input.sortOrder ?? 0,
        input.isActive !== false,
      ],
    );
    return (await this.listPricing(gymId)).find((row) => row.id === id) ?? null;
  },

  async deletePricing(gymId: string, id: string) {
    await query("DELETE FROM website_pricing_plans WHERE id = $1 AND gym_id = $2", [
      id,
      gymId,
    ]);
  },

  async listBlog(gymId: string, publicOnly = false) {
    const rows = await query(
      `SELECT * FROM website_blog_posts
       WHERE gym_id = $1 ${publicOnly ? "AND status = 'published'" : ""}
       ORDER BY COALESCE(published_at, created_at) DESC`,
      [gymId],
    );
    return rows.map((r) => normalizeBlog(r as Record<string, unknown>));
  },

  async upsertBlog(gymId: string, input: Record<string, unknown>, id: string = makeId()) {
    await query(
      `INSERT INTO website_blog_posts
       (id, gym_id, title, slug, excerpt, body, cover_image_url, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         excerpt = EXCLUDED.excerpt,
         body = EXCLUDED.body,
         cover_image_url = EXCLUDED.cover_image_url,
         status = EXCLUDED.status,
         published_at = EXCLUDED.published_at`,
      [
        id,
        gymId,
        input.title,
        input.slug,
        input.excerpt ?? null,
        input.body ?? null,
        input.coverImageUrl ?? null,
        input.status ?? "draft",
        input.status === "published" ? input.publishedAt ?? new Date() : null,
      ],
    );
    return (await this.listBlog(gymId)).find((row) => row.id === id) ?? null;
  },

  async deleteBlog(gymId: string, id: string) {
    await query("DELETE FROM website_blog_posts WHERE id = $1 AND gym_id = $2", [
      id,
      gymId,
    ]);
  },

  async fullContent(gymId: string, publicOnly = false) {
    const [branding, sections, gallery, programs, pricing, blog] = await Promise.all([
      this.getBranding(gymId),
      this.listSections(gymId),
      this.listGallery(gymId, publicOnly),
      this.listPrograms(gymId, publicOnly),
      this.listPricing(gymId, publicOnly),
      this.listBlog(gymId, publicOnly),
    ]);

    return { gymId, branding, sections, gallery, programs, pricing, blog };
  },
};