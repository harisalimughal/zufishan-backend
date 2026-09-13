import crypto from "node:crypto";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

type Provider = "CARD" | "JAZZCASH" | "EASYPAISA";

class MarketplacePaymentService {
  async createIntent(userId: string, orderId: string, provider: Provider, returnUrl?: string) {
    const order = await (prisma as any).order.findFirst({ where: { id: orderId, buyer: { userId } } });
    if (!order) throw new ApiError(404, "Order not found");
    if (order.status === "CANCELLED") throw new ApiError(400, "Cancelled orders cannot be paid");
    if (order.paymentStatus === "PAID") throw new ApiError(409, "Order is already paid");

    const paymentReference = order.paymentReference || `PAY-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const updated = await (prisma as any).order.update({
      where: { id: order.id },
      data: { paymentProvider: provider, paymentReference },
    });

    const gatewayPayload = {
      orderId: updated.id,
      paymentReference,
      amount: Number(updated.totalAmount),
      currency: "PKR",
      provider,
      returnUrl,
    };
    const gateway = await this.gatewayRequest("/payments/intents", gatewayPayload);
    return { orderId: updated.id, paymentReference, provider, status: updated.paymentStatus, gateway };
  }

  async handleWebhook(provider: string, payload: { paymentReference: string; status: string; providerTransactionId?: string }, signature?: string) {
    this.verifySignature(payload, signature);
    const order = await (prisma as any).order.findUnique({ where: { paymentReference: payload.paymentReference } });
    if (!order || order.paymentProvider !== provider) throw new ApiError(404, "Payment reference not found");

    const data: any = { paymentStatus: payload.status };
    if (payload.status === "PAID") data.paidAt = new Date();
    if (payload.status === "REFUNDED") data.refundedAt = new Date();
    return (prisma as any).order.update({ where: { id: order.id }, data });
  }

  async refund(userId: string, orderId: string, reason?: string) {
    const order = await (prisma as any).order.findUnique({ where: { id: orderId } });
    if (!order) throw new ApiError(404, "Order not found");
    if (order.paymentStatus !== "PAID") throw new ApiError(400, "Only paid orders can be refunded");
    if (!order.paymentReference || !order.paymentProvider) throw new ApiError(400, "Payment reference is missing");

    const gateway = await this.gatewayRequest("/payments/refunds", {
      orderId: order.id,
      paymentReference: order.paymentReference,
      amount: Number(order.totalAmount),
      reason,
    });
    const updated = await (prisma as any).order.update({
      where: { id: order.id },
      data: { paymentStatus: "REFUNDED", refundedAt: new Date() },
    });
    return { order: updated, gateway };
  }

  private verifySignature(payload: object, signature?: string) {
    if (!env.PAYMENT_WEBHOOK_SECRET) throw new ApiError(503, "Payment webhook secret is not configured");
    if (!signature) throw new ApiError(401, "Payment signature is required");
    const expected = crypto.createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET).update(JSON.stringify(payload)).digest("hex");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new ApiError(401, "Invalid payment signature");
    }
  }

  private async gatewayRequest(path: string, body: object) {
    if (!env.PAYMENT_GATEWAY_URL || !env.PAYMENT_GATEWAY_API_KEY) {
      throw new ApiError(503, "Payment gateway is not configured");
    }
    const response = await fetch(`${env.PAYMENT_GATEWAY_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.PAYMENT_GATEWAY_API_KEY}` },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(502, "Payment gateway request failed");
    return result;
  }
}

export const marketplacePaymentService = new MarketplacePaymentService();
