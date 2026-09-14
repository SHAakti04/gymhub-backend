import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { leadsRepository } from "./leads.repository.js";

export const leadsService = {
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
    if (!input.consentGiven) {
      throw new AppError(400, "CONSENT_REQUIRED", "Lead consent is required");
    }
    return leadsRepository.createLead(input);
  },

  async listLeads(gymId: string) {
    return leadsRepository.listLeads(gymId);
  },

  async updateLeadStatus(id: string, status: string) {
    const updated = await leadsRepository.updateLeadStatus(id, status);
    if (!updated) throw new AppError(404, "LEAD_NOT_FOUND", "Lead not found");
    return updated;
  },

  async optOut(id: string, phone: string) {
    await leadsRepository.optOut(id, phone);
    return { success: true };
  },

  async analytics(gymId: string) {
    return leadsRepository.analytics(gymId);
  },

  async createBroadcast(input: { gymId: string; leadId?: string | null; phone: string; message: string; campaign: string; channel: string }) {
    await leadsRepository.createBroadcast(input);
    return { queued: true };
  },

  async searchNearbyBusinesses(input: { gymId: string; lat: number; lng: number; radiusMeters: number }) {
    const overpassQuery = `
[out:json];
(
  node(around:${input.radiusMeters},${input.lat},${input.lng})["shop"];
  node(around:${input.radiusMeters},${input.lat},${input.lng})["office"];
  node(around:${input.radiusMeters},${input.lat},${input.lng})["amenity"="restaurant"];
  node(around:${input.radiusMeters},${input.lat},${input.lng})["amenity"="cafe"];
);
out body 25;
`;

    const response = await fetch(env.OVERPASS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "User-Agent": "mygym-backend/1.0" },
      body: overpassQuery
    });

    if (!response.ok) {
      throw new AppError(502, "OVERPASS_FAILED", "Nearby business lookup failed");
    }

    const json = (await response.json()) as {
      elements?: Array<{ id: number; lat?: number; lon?: number; tags?: Record<string, string> }>;
    };

    const items = (json.elements ?? []).map((item) => ({
      externalPlaceId: String(item.id),
      name: item.tags?.name ?? "Unnamed business",
      businessType: item.tags?.shop ?? item.tags?.office ?? item.tags?.amenity ?? null,
      address: item.tags?.["addr:full"] ?? item.tags?.["addr:street"] ?? null,
      lat: item.lat ?? null,
      lng: item.lon ?? null,
      distanceKm: null
    }));

    for (const item of items) {
      await leadsRepository.saveNearbyBusiness({
        gymId: input.gymId,
        ...item
      });
    }

    return items;
  }
};