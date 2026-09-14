import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
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

const normalizeBranding = (row: RowDataPacket | undefined | null) =>
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

const normalizeSection = (row: RowDataPacket) => ({
  id: row.id,
  gymId: row.gym_id,
  sectionKey: row.section_key,
  content: parseJson(row.content_json, {}),
});

const normalizeGallery = (row: RowDataPacket) => ({
  id: row.id,
  title: row.title,
  imageUrl: row.image_url,
  altText: row.alt_text,
  sortOrder: Number(row.sort_order ?? 0),
  isActive: Boolean(row.is_active),
});

const normalizeProgram = (row: RowDataPacket) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  duration: row.duration,
  levelName: row.level_name,
  iconKey: row.icon_key,
  sortOrder: Number(row.sort_order ?? 0),
  isActive: Boolean(row.is_active),
});

const normalizePricing = (row: RowDataPacket) => ({
  id: row.id,
  name: row.name,
  price: Number(row.price ?? 0),
  duration: row.duration,
  features: parseJson(row.features_json, []),
  isPopular: Boolean(row.is_popular),
  sortOrder: Number(row.sort_order ?? 0),
  isActive: Boolean(row.is_active),
});

const normalizeBlog = (row: RowDataPacket) => ({
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
    const rows = await query<RowDataPacket[]>(
      "SELECT * FROM gym_branding WHERE gym_id = ? LIMIT 1",
      [gymId],
    );
    return normalizeBranding(rows[0]);
  },

  async saveBranding(gymId: string, input: Record<string, unknown>) {
    await query<ResultSetHeader>(
      `INSERT INTO gym_branding
       (gym_id, public_name, tagline, logo_url, hero_image_url, phone, email, address, map_embed_url, social_links_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         public_name = VALUES(public_name),
         tagline = VALUES(tagline),
         logo_url = VALUES(logo_url),
         hero_image_url = VALUES(hero_image_url),
         phone = VALUES(phone),
         email = VALUES(email),
         address = VALUES(address),
         map_embed_url = VALUES(map_embed_url),
         social_links_json = VALUES(social_links_json)`,
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
    const rows = await query<RowDataPacket[]>(
      "SELECT * FROM website_sections WHERE gym_id = ? ORDER BY section_key",
      [gymId],
    );
    return rows.map(normalizeSection);
  },

  async saveSection(gymId: string, sectionKey: string, content: unknown) {
    const id = makeId();
    await query<ResultSetHeader>(
      `INSERT INTO website_sections (id, gym_id, section_key, content_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content_json = VALUES(content_json)`,
      [id, gymId, sectionKey, JSON.stringify(content ?? {})],
    );

    const rows = await query<RowDataPacket[]>(
      "SELECT * FROM website_sections WHERE gym_id = ? AND section_key = ? LIMIT 1",
      [gymId, sectionKey],
    );
    return normalizeSection(rows[0]);
  },

  async listGallery(gymId: string, publicOnly = false) {
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM website_gallery_images
       WHERE gym_id = ? ${publicOnly ? "AND is_active = 1" : ""}
       ORDER BY sort_order ASC, created_at DESC`,
      [gymId],
    );
    return rows.map(normalizeGallery);
  },

  async upsertGallery(gymId: string, input: Record<string, unknown>, id: string = makeId()) {
    await query<ResultSetHeader>(
      `INSERT INTO website_gallery_images (id, gym_id, title, image_url, alt_text, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         image_url = VALUES(image_url),
         alt_text = VALUES(alt_text),
         sort_order = VALUES(sort_order),
         is_active = VALUES(is_active)`,
      [
        id,
        gymId,
        input.title ?? null,
        input.imageUrl,
        input.altText ?? null,
        input.sortOrder ?? 0,
        input.isActive === false ? 0 : 1,
      ],
    );
    return (await this.listGallery(gymId)).find((row) => row.id === id) ?? null;
  },

  async deleteGallery(gymId: string, id: string) {
    await query<ResultSetHeader>("DELETE FROM website_gallery_images WHERE id = ? AND gym_id = ?", [
      id,
      gymId,
    ]);
  },

  async listPrograms(gymId: string, publicOnly = false) {
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM website_programs
       WHERE gym_id = ? ${publicOnly ? "AND is_active = 1" : ""}
       ORDER BY sort_order ASC, created_at DESC`,
      [gymId],
    );
    return rows.map(normalizeProgram);
  },

  async upsertProgram(gymId: string, input: Record<string, unknown>, id: string = makeId()) {
    await query<ResultSetHeader>(
      `INSERT INTO website_programs
       (id, gym_id, name, description, duration, level_name, icon_key, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         duration = VALUES(duration),
         level_name = VALUES(level_name),
         icon_key = VALUES(icon_key),
         sort_order = VALUES(sort_order),
         is_active = VALUES(is_active)`,
      [
        id,
        gymId,
        input.name,
        input.description ?? null,
        input.duration ?? null,
        input.levelName ?? null,
        input.iconKey ?? "Dumbbell",
        input.sortOrder ?? 0,
        input.isActive === false ? 0 : 1,
      ],
    );
    return (await this.listPrograms(gymId)).find((row) => row.id === id) ?? null;
  },

  async deleteProgram(gymId: string, id: string) {
    await query<ResultSetHeader>("DELETE FROM website_programs WHERE id = ? AND gym_id = ?", [
      id,
      gymId,
    ]);
  },

  async listPricing(gymId: string, publicOnly = false) {
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM website_pricing_plans
       WHERE gym_id = ? ${publicOnly ? "AND is_active = 1" : ""}
       ORDER BY sort_order ASC, created_at DESC`,
      [gymId],
    );
    return rows.map(normalizePricing);
  },

  async upsertPricing(gymId: string, input: Record<string, unknown>, id: string = makeId()) {
    await query<ResultSetHeader>(
      `INSERT INTO website_pricing_plans
       (id, gym_id, name, price, duration, features_json, is_popular, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         price = VALUES(price),
         duration = VALUES(duration),
         features_json = VALUES(features_json),
         is_popular = VALUES(is_popular),
         sort_order = VALUES(sort_order),
         is_active = VALUES(is_active)`,
      [
        id,
        gymId,
        input.name,
        input.price,
        input.duration ?? "month",
        JSON.stringify(input.features ?? []),
        input.isPopular ? 1 : 0,
        input.sortOrder ?? 0,
        input.isActive === false ? 0 : 1,
      ],
    );
    return (await this.listPricing(gymId)).find((row) => row.id === id) ?? null;
  },

  async deletePricing(gymId: string, id: string) {
    await query<ResultSetHeader>("DELETE FROM website_pricing_plans WHERE id = ? AND gym_id = ?", [
      id,
      gymId,
    ]);
  },

  async listBlog(gymId: string, publicOnly = false) {
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM website_blog_posts
       WHERE gym_id = ? ${publicOnly ? "AND status = 'published'" : ""}
       ORDER BY COALESCE(published_at, created_at) DESC`,
      [gymId],
    );
    return rows.map(normalizeBlog);
  },

  async upsertBlog(gymId: string, input: Record<string, unknown>, id: string = makeId()) {
    await query<ResultSetHeader>(
      `INSERT INTO website_blog_posts
       (id, gym_id, title, slug, excerpt, body, cover_image_url, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         excerpt = VALUES(excerpt),
         body = VALUES(body),
         cover_image_url = VALUES(cover_image_url),
         status = VALUES(status),
         published_at = VALUES(published_at)`,
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
    await query<ResultSetHeader>("DELETE FROM website_blog_posts WHERE id = ? AND gym_id = ?", [
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