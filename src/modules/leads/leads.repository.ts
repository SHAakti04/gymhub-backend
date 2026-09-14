import type { RowDataPacket } from "mysql2";
import { query } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export const leadsRepository = {
  async createLead(input: {
    gymId: string;
    name: string;
    phone: string;
    email?: string | null;
    source: string;
    consentGiven: boolean;
    lat?: number | null;
    lng?: number | null;
    distanceKm?: number | null;
    refCode?: string | null;
    notes?: string | null;
    metaPayload?: unknown;
    consentIp?: string | null;
    consentUserAgent?: string | null;
  }) {
    const leadId = makeId();
    await query(
      `
      INSERT INTO leads (
        id, gym_id, name, phone, email, source, status, lat, lng, distance_km,
        consent_given, consent_at, consent_ip, consent_user_agent, ref_code, notes, meta_payload
      )
      VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
      `,
      [
        leadId,
        input.gymId,
        input.name,
        input.phone,
        input.email ?? null,
        input.source,
        input.lat ?? null,
        input.lng ?? null,
        input.distanceKm ?? null,
        input.consentGiven ? 1 : 0,
        input.consentIp ?? null,
        input.consentUserAgent ?? null,
        input.refCode ?? null,
        input.notes ?? null,
        input.metaPayload ? JSON.stringify(input.metaPayload) : null
      ]
    );

    await query(
      `
      INSERT INTO lead_consent_audit (id, lead_id, phone, action_name, ip_address, user_agent, metadata_json)
      VALUES (?, ?, ?, 'lead_submitted', ?, ?, ?)
      `,
      [
        makeId(),
        leadId,
        input.phone,
        input.consentIp ?? null,
        input.consentUserAgent ?? null,
        JSON.stringify({ source: input.source, consentGiven: input.consentGiven })
      ]
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM leads WHERE id = ? LIMIT 1", [leadId]);
    return rows[0];
  },

  async listLeads(gymId: string) {
    return query<RowDataPacket[]>("SELECT * FROM leads WHERE gym_id = ? ORDER BY created_at DESC", [gymId]);
  },

  async updateLeadStatus(id: string, status: string) {
    await query("UPDATE leads SET status = ? WHERE id = ?", [status, id]);
    const rows = await query<RowDataPacket[]>("SELECT * FROM leads WHERE id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
  },

  async optOut(id: string, phone: string) {
    await query("UPDATE leads SET status = 'opted_out' WHERE id = ?", [id]);
    await query(
      "INSERT INTO lead_consent_audit (id, lead_id, phone, action_name, metadata_json) VALUES (?, ?, ?, 'opt_out', JSON_OBJECT())",
      [makeId(), id, phone]
    );
  },

  async analytics(gymId: string) {
    const [counts] = await Promise.all([
      query<RowDataPacket[]>(
        `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
          SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted_count,
          SUM(CASE WHEN status = 'opted_out' THEN 1 ELSE 0 END) AS opted_out_count
        FROM leads
        WHERE gym_id = ?
        `,
        [gymId]
      ),
      query<RowDataPacket[]>(
        `
        SELECT source, COUNT(*) AS count
        FROM leads
        WHERE gym_id = ?
        GROUP BY source
        ORDER BY count DESC
        `,
        [gymId]
      )
    ]);

    return { summary: counts[0], bySource: counts[1] };
  },

  async createBroadcast(input: { gymId: string; leadId?: string | null; phone: string; message: string; campaign: string; channel: string }) {
    await query(
      `
      INSERT INTO broadcast_logs (id, gym_id, lead_id, phone, message, campaign, channel, consent_verified, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'queued')
      `,
      [makeId(), input.gymId, input.leadId ?? null, input.phone, input.message, input.campaign, input.channel]
    );
  },

  async saveNearbyBusiness(input: {
    gymId: string;
    externalPlaceId?: string | null;
    name: string;
    businessType?: string | null;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
    distanceKm?: number | null;
  }) {
    await query(
      `
      INSERT INTO nearby_businesses
      (id, gym_id, external_place_id, name, business_type, address, lat, lng, distance_km, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [makeId(), input.gymId, input.externalPlaceId ?? null, input.name, input.businessType ?? null, input.address ?? null, input.lat ?? null, input.lng ?? null, input.distanceKm ?? null]
    );
  }
};