import { AppError } from "../../common/errors/app-error.js";
import { offersRepository, type OfferRow } from "./offers.repository.js";

function mapOffer(row: OfferRow) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    discountPct: Number(row.discount_pct),
    validFrom: row.valid_from,
    validTo: row.valid_to,
    active: Boolean(row.active),
    appliesTo: row.applies_to,
    createdAt: row.created_at,
  };
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function assertValidInput(input: { discountPct: number; validFrom: string; validTo: string }) {
  if (input.discountPct < 1 || input.discountPct > 100) {
    throw new AppError(400, "VALIDATION_ERROR", "Discount percentage must be between 1 and 100");
  }
  if (input.validFrom > input.validTo) {
    throw new AppError(400, "VALIDATION_ERROR", "Valid-from date must be on or before valid-to date");
  }
}

async function withDuplicateGuard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      throw new AppError(409, "DUPLICATE_CODE", "An offer with this code already exists");
    }
    throw error;
  }
}

export const offersService = {
  async list(gymId: string) {
    const rows = await offersRepository.listForGym(gymId);
    return rows.map(mapOffer);
  },

  async listActive(gymId: string) {
    const rows = await offersRepository.listActiveForGym(gymId);
    return rows.map(mapOffer);
  },

  async create(
    gymId: string,
    input: {
      code: string;
      title: string;
      discountPct: number;
      validFrom: string;
      validTo: string;
      active?: boolean;
      appliesTo: "all" | "new" | "renewal";
    },
  ) {
    assertValidInput(input);
    const row = await withDuplicateGuard(() =>
      offersRepository.create({
        gymId,
        code: normalizeCode(input.code),
        title: input.title.trim(),
        discountPct: input.discountPct,
        validFrom: input.validFrom,
        validTo: input.validTo,
        active: input.active ?? true,
        appliesTo: input.appliesTo,
      }),
    );
    return mapOffer(row!);
  },

  async update(
    id: string,
    gymId: string,
    patch: Partial<{
      code: string;
      title: string;
      discountPct: number;
      validFrom: string;
      validTo: string;
      active: boolean;
      appliesTo: "all" | "new" | "renewal";
    }>,
  ) {
    if (patch.discountPct !== undefined || patch.validFrom !== undefined || patch.validTo !== undefined) {
      const existing = await offersRepository.getById(id, gymId);
      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Offer not found");
      }
      assertValidInput({
        discountPct: patch.discountPct ?? Number(existing.discount_pct),
        validFrom: patch.validFrom ?? existing.valid_from,
        validTo: patch.validTo ?? existing.valid_to,
      });
    }

    const row = await withDuplicateGuard(() =>
      offersRepository.update(id, gymId, {
        ...patch,
        code: patch.code !== undefined ? normalizeCode(patch.code) : undefined,
        title: patch.title !== undefined ? patch.title.trim() : undefined,
      }),
    );

    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Offer not found");
    }
    return mapOffer(row);
  },

  async remove(id: string, gymId: string) {
    const existing = await offersRepository.getById(id, gymId);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Offer not found");
    }
    await offersRepository.remove(id, gymId);
    return { deleted: true };
  },

  async validateAndPrice(gymId: string, code: string, baseAmount: number, appliesToContext: "renewal") {
    const offer = await offersRepository.getActiveByCode(gymId, normalizeCode(code));

    if (!offer) {
      throw new AppError(400, "INVALID_OFFER", "Offer code is invalid or expired");
    }

    if (offer.applies_to !== "all" && offer.applies_to !== appliesToContext) {
      throw new AppError(400, "INVALID_OFFER", "This offer code cannot be used for renewals");
    }

    const discountPct = Number(offer.discount_pct);
    const discountAmount = Math.round(baseAmount * (discountPct / 100) * 100) / 100;
    const finalAmount = Math.round((baseAmount - discountAmount) * 100) / 100;

    return {
      offerId: offer.id,
      code: offer.code,
      discountPct,
      discountAmount,
      finalAmount,
    };
  },
};