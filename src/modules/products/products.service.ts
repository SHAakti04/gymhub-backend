import { AppError } from "../../common/errors/app-error.js";
import { productsRepository, type OrderRow, type ProductRow } from "./products.repository.js";

function parseImages(row: ProductRow): string[] {
  try {
    const parsed = row.images_json ? JSON.parse(row.images_json) : [];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // fall through to image_url fallback
  }
  return row.image_url ? [row.image_url] : [];
}

function mapProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    discountPrice: row.discount_price !== null ? Number(row.discount_price) : null,
    stockQty: row.stock_qty,
    category: row.category,
    brand: row.brand,
    images: parseImages(row),
    createdAt: row.created_at,
  };
}

export const productsService = {
  async list(gymId: string) {
    const rows = await productsRepository.listForGym(gymId);
    return (rows as ProductRow[]).map(mapProduct);
  },

  async get(id: string, gymId: string) {
    const row = await productsRepository.getById(id, gymId);
    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Product not found");
    }
    return mapProduct(row as ProductRow);
  },

  async create(
    gymId: string,
    input: {
      name: string;
      description?: string;
      price: number;
      stockQty: number;
      category?: string;
      discountPrice?: number;
      brand?: string;
      images: string[];
    },
  ) {
    if (input.price <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Price must be greater than 0");
    }
    if (!input.images.length) {
      throw new AppError(400, "VALIDATION_ERROR", "At least one image is required");
    }
    const row = await productsRepository.create({ gymId, ...input });
    return mapProduct(row as ProductRow);
  },

  async update(
    id: string,
    gymId: string,
    patch: Partial<{
      name: string;
      description: string;
      price: number;
      stockQty: number;
      category: string;
      discountPrice: number | null;
      brand: string;
      images: string[];
    }>,
  ) {
    const row = await productsRepository.update(id, gymId, patch);
    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Product not found");
    }
    return mapProduct(row as ProductRow);
  },

  async remove(id: string, gymId: string) {
    const existing = await productsRepository.getById(id, gymId);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Product not found");
    }
    try {
      await productsRepository.remove(id, gymId);
    } catch (error: any) {
      if (error?.code === "ER_ROW_IS_REFERENCED_2" || error?.code === "ER_ROW_IS_REFERENCED") {
        throw new AppError(409, "PRODUCT_HAS_ORDERS", "This product has existing orders and cannot be deleted. Set stock to 0 instead.");
      }
      throw error;
    }
    return { deleted: true };
  },

  async checkout(
    gymId: string,
    memberId: string,
    input: {
      items: { productId: string; quantity: number }[];
      paymentMethod: "offline" | "online";
      upiTxnRef?: string;
      paymentNote?: string;
    },
  ) {
    if (!input.items.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Cart is empty");
    }
    if (input.paymentMethod === "online" && !input.upiTxnRef?.trim()) {
      throw new AppError(400, "VALIDATION_ERROR", "UPI transaction reference is required");
    }

    try {
      return await productsRepository.createOrder({
        gymId,
        memberId,
        items: input.items,
        paymentMethod: input.paymentMethod,
        upiTxnRef: input.upiTxnRef?.trim(),
        paymentNote: input.paymentNote?.trim(),
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("PRODUCT_NOT_FOUND")) {
        throw new AppError(404, "NOT_FOUND", "One of the products in your cart no longer exists");
      }
      if (message.startsWith("OUT_OF_STOCK")) {
        throw new AppError(400, "OUT_OF_STOCK", `${message.split(":")[1]} is out of stock`);
      }
      throw error;
    }
  },

  async attachItems(order: OrderRow) {
    const items = await productsRepository.getOrderItems(order.id);
    return {
      id: order.id,
      status: order.status,
      totalAmount: Number(order.total_amount),
      paymentMethod: order.payment_method,
      upiTxnRef: order.upi_txn_ref,
      paymentNote: order.payment_note,
      placedAt: order.placed_at,
      fulfilledAt: order.fulfilled_at,
      cancelledAt: order.cancelled_at,
      memberName: order.member_name ?? null,
      items: items.map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        unitPrice: Number(item.unit_price),
        quantity: item.quantity,
        lineTotal: Number(item.line_total),
      })),
    };
  },

  async listOrdersForGym(gymId: string) {
    const orders = await productsRepository.listOrdersForGym(gymId);
    return Promise.all(orders.map((order) => this.attachItems(order as OrderRow)));
  },

  async listMyOrders(gymId: string, memberId: string) {
    const orders = await productsRepository.listOrdersForMember(gymId, memberId);
    return Promise.all(orders.map((order) => this.attachItems(order as OrderRow)));
  },

  async getOrder(gymId: string, memberId: string | null, id: string, isAdmin: boolean) {
    const order = await productsRepository.getOrderById(id, gymId);
    if (!order) {
      throw new AppError(404, "NOT_FOUND", "Order not found");
    }
    if (!isAdmin && order.member_id !== memberId) {
      throw new AppError(403, "FORBIDDEN", "You cannot view this order");
    }
    return this.attachItems(order as OrderRow);
  },

  async fulfillOrder(gymId: string, id: string) {
    const order = await productsRepository.getOrderById(id, gymId);
    if (!order) {
      throw new AppError(404, "NOT_FOUND", "Order not found");
    }
    const updated = await productsRepository.fulfillOrder(id, gymId);
    return this.attachItems(updated as OrderRow);
  },

  async cancelOrder(gymId: string, memberId: string | null, id: string, isAdmin: boolean) {
    const order = await productsRepository.getOrderById(id, gymId);
    if (!order) {
      throw new AppError(404, "NOT_FOUND", "Order not found");
    }
    if (!isAdmin && order.member_id !== memberId) {
      throw new AppError(403, "FORBIDDEN", "You cannot cancel this order");
    }
    if (!["pending", "payment_review_required"].includes(order.status)) {
      throw new AppError(400, "VALIDATION_ERROR", "This order can no longer be cancelled");
    }
    await productsRepository.cancelOrderAndRestock(id, gymId);
    const updated = await productsRepository.getOrderById(id, gymId);
    return this.attachItems(updated as OrderRow);
  },
};