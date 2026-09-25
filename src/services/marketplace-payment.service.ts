import crypto from "crypto";
import prisma from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { env } from "../config/env";

const terminalStatuses = new Set(["PAID", "REFUNDED", "CANCELLED"]);
const allowedTransitions: Record<string, string[]> = {
  PENDING: ["PENDING", "PAID", "CANCELLED"],
  PAID: ["PAID", "REFUNDED"],
  REFUNDED: ["REFUNDED"],
  CANCELLED: ["CANCELLED"],
};

export const canTransitionPayment = (current: string, next: string): boolean =>
  allowedTransitions[current]?.includes(next) ?? false;

export class MarketplacePaymentService {
  async createIntent(userId: string, orderId: string, _provider?: string, _returnUrl?: string) {
    return this.createPaymentIntent(orderId, userId);
  }

  async createPaymentIntent(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, buyer: { userId } },
      select: { id: true, totalAmount: true, status: true, paymentStatus: true, paymentReference: true },
    });
    if (!order) throw new ApiError(404, "Order not found");
    if (terminalStatuses.has(order.status) || terminalStatuses.has(order.paymentStatus)) {
      throw new ApiError(409, "A payment intent cannot be created for this order state");
    }
    const paymentReference = order.paymentReference ?? `pay_${crypto.randomUUID()}`;
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: "PENDING", paymentReference: null },
      data: { paymentReference },
    });
    const current = await prisma.order.findUnique({
      where: { id: order.id },
      select: { paymentReference: true, paymentStatus: true, totalAmount: true },
    });
    return { orderId: order.id, amount: current?.totalAmount ?? order.totalAmount, reference: current?.paymentReference, status: current?.paymentStatus };
  }

  async handleWebhook(payload: { eventId: string; orderId: string; status: string }, signature: string) {
    const secret = env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(503, "Payment webhook verification is not configured");
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    const supplied = signature.replace(/^sha256=/, "");
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new ApiError(401, "Invalid payment webhook signature");
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.paymentWebhookEvent.findUnique({ where: { eventId: payload.eventId } });
      if (existing) {
        if (existing.orderId !== payload.orderId || existing.status !== payload.status) {
          throw new ApiError(409, "Payment event ID was already used with different data");
        }
        return { duplicate: true, orderId: existing.orderId, paymentStatus: existing.status };
      }

      const order = await tx.order.findUnique({ where: { id: payload.orderId }, select: { status: true, paymentStatus: true } });
      if (!order) throw new ApiError(404, "Order not found");
      if (order.status === "CANCELLED" && payload.status !== "CANCELLED") {
        throw new ApiError(409, "Cancelled orders cannot receive payment updates");
      }
      if (!canTransitionPayment(order.paymentStatus, payload.status)) {
        throw new ApiError(409, `Invalid payment transition from ${order.paymentStatus} to ${payload.status}`);
      }

      await tx.paymentWebhookEvent.create({
        data: { eventId: payload.eventId, orderId: payload.orderId, status: payload.status, signature },
      });
      const updated = await tx.order.updateMany({
        where: { id: payload.orderId, paymentStatus: order.paymentStatus },
        data: { paymentStatus: payload.status },
      });
      if (updated.count !== 1) throw new ApiError(409, "Payment state changed concurrently; retry the webhook");
      return { duplicate: false, orderId: payload.orderId, paymentStatus: payload.status };
    });
  }

  async refund(_adminUserId: string, orderId: string, _reason?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, paymentStatus: true, status: true } });
      if (!order) throw new ApiError(404, "Order not found");
      if (order.paymentStatus !== "PAID") throw new ApiError(409, "Only paid orders can be refunded");
      const updated = await tx.order.updateMany({ where: { id: orderId, paymentStatus: "PAID" }, data: { paymentStatus: "REFUNDED" } });
      if (updated.count !== 1) throw new ApiError(409, "Payment state changed; retry the refund");
      return { id: orderId, paymentStatus: "REFUNDED" };
    });
  }
}

export const marketplacePaymentService = new MarketplacePaymentService();
