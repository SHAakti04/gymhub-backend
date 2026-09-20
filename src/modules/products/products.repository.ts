import { query, withTransaction } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";

export interface ProductRow {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  price: string;
  stock_qty: number;
  image_url: string | null;
  category: string | null;
  discount_price: string | null;
  brand: string | null;
  images_json: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  gym_id: string;
  member_id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  upi_txn_ref: string | null;
  payment_note: string | null;
  placed_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  member_name?: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export const productsRepository = {
  async listForGym(gymId: string) {
    return query(`SELECT * FROM products WHERE gym_id = $1 ORDER BY created_at DESC`, [gymId]);
  },

  async getById(id: string, gymId: string) {
    const rows = await query(`SELECT * FROM products WHERE id = $1 AND gym_id = $2 LIMIT 1`, [id, gymId]);
    return rows[0] ?? null;
  },

  async create(input: {
    gymId: string;
    name: string;
    description?: string | null;
    price: number;
    stockQty: number;
    category?: string | null;
    discountPrice?: number | null;
    brand?: string | null;
    images: string[];
  }) {
    const id = makeId();
    await query(
      `INSERT INTO products
       (id, gym_id, name, description, price, stock_qty, image_url, category, discount_price, brand, images_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        id,
        input.gymId,
        input.name,
        input.description ?? null,
        input.price,
        input.stockQty,
        input.images[0] ?? null,
        input.category ?? null,
        input.discountPrice ?? null,
        input.brand ?? null,
        JSON.stringify(input.images),
      ],
    );
    return this.getById(id, input.gymId);
  },

  async update(
    id: string,
    gymId: string,
    patch: Partial<{
      name: string;
      description: string | null;
      price: number;
      stockQty: number;
      category: string | null;
      discountPrice: number | null;
      brand: string | null;
      images: string[];
    }>,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (patch.name !== undefined) { fields.push("name"); values.push(patch.name); }
    if (patch.description !== undefined) { fields.push("description"); values.push(patch.description); }
    if (patch.price !== undefined) { fields.push("price"); values.push(patch.price); }
    if (patch.stockQty !== undefined) { fields.push("stock_qty"); values.push(patch.stockQty); }
    if (patch.category !== undefined) { fields.push("category"); values.push(patch.category); }
    if (patch.discountPrice !== undefined) { fields.push("discount_price"); values.push(patch.discountPrice); }
    if (patch.brand !== undefined) { fields.push("brand"); values.push(patch.brand); }
    if (patch.images !== undefined) {
      fields.push("images_json"); values.push(JSON.stringify(patch.images));
      fields.push("image_url"); values.push(patch.images[0] ?? null);
    }

    if (fields.length === 0) return this.getById(id, gymId);

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    await query(
      `UPDATE products SET ${setClauses} WHERE id = $${fields.length + 1} AND gym_id = $${fields.length + 2}`,
      [...values, id, gymId],
    );
    return this.getById(id, gymId);
  },

  async remove(id: string, gymId: string) {
    await query(`DELETE FROM products WHERE id = $1 AND gym_id = $2`, [id, gymId]);
  },

  async createOrder(input: {
    gymId: string;
    memberId: string;
    items: { productId: string; quantity: number }[];
    paymentMethod: "offline" | "online";
    upiTxnRef?: string | null;
    paymentNote?: string | null;
  }) {
    return withTransaction(async (connection) => {
      let totalAmount = 0;
      const lineItems: { productId: string; productName: string; unitPrice: number; quantity: number; lineTotal: number }[] = [];

      for (const item of input.items) {
        const result = await connection.query(
          `SELECT * FROM products WHERE id = $1 AND gym_id = $2 LIMIT 1 FOR UPDATE`,
          [item.productId, input.gymId],
        );
        const product = result.rows[0] as Record<string, unknown> | undefined;
        if (!product) {
          throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
        }
        if ((product.stock_qty as number) < item.quantity) {
          throw new Error(`OUT_OF_STOCK:${product.name}`);
        }

        const unitPrice = Number(product.discount_price ?? product.price);
        const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
        totalAmount += lineTotal;
        lineItems.push({ productId: product.id as string, productName: product.name as string, unitPrice, quantity: item.quantity, lineTotal });

        await connection.query(`UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2`, [item.quantity, product.id]);
      }

      const orderId = makeId();
      const status = input.paymentMethod === "online" ? "payment_review_required" : "pending";
      const roundedTotal = Math.round(totalAmount * 100) / 100;

      await connection.query(
        `INSERT INTO orders
         (id, gym_id, member_id, status, total_amount, payment_method, upi_txn_ref, payment_note, placed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [orderId, input.gymId, input.memberId, status, roundedTotal, input.paymentMethod, input.upiTxnRef ?? null, input.paymentNote ?? null],
      );

      for (const line of lineItems) {
        await connection.query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, line_total, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [makeId(), orderId, line.productId, line.productName, line.unitPrice, line.quantity, line.lineTotal],
        );
      }

      return { orderId, totalAmount: roundedTotal };
    });
  },

  async listOrdersForGym(gymId: string) {
    return query(
      `SELECT o.*, u.full_name AS member_name
       FROM orders o
       JOIN members m ON m.id = o.member_id
       JOIN users u ON u.id = m.user_id
       WHERE o.gym_id = $1
       ORDER BY o.created_at DESC`,
      [gymId],
    );
  },

  async listOrdersForMember(gymId: string, memberId: string) {
    return query(`SELECT * FROM orders WHERE gym_id = $1 AND member_id = $2 ORDER BY created_at DESC`, [gymId, memberId]);
  },

  async getOrderById(id: string, gymId: string) {
    const rows = await query(`SELECT * FROM orders WHERE id = $1 AND gym_id = $2 LIMIT 1`, [id, gymId]);
    return rows[0] ?? null;
  },

  async getOrderItems(orderId: string) {
    return query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
  },

  async fulfillOrder(id: string, gymId: string) {
    await query(`UPDATE orders SET status = 'fulfilled', fulfilled_at = NOW() WHERE id = $1 AND gym_id = $2`, [id, gymId]);
    return this.getOrderById(id, gymId);
  },

  async cancelOrderAndRestock(id: string, gymId: string) {
    return withTransaction(async (connection) => {
      const itemsResult = await connection.query(
        `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
        [id],
      );
      for (const item of itemsResult.rows as Record<string, unknown>[]) {
        await connection.query(`UPDATE products SET stock_qty = stock_qty + $1 WHERE id = $2`, [item.quantity, item.product_id]);
      }
      await connection.query(`UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1 AND gym_id = $2`, [id, gymId]);
    });
  },
};