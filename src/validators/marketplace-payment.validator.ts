import { z } from "zod";

export const paymentWebhookSchema = z.object({
  eventId: z.string().min(8).max(200),
  orderId: z.string().cuid(),
  status: z.enum(["PENDING", "PAID", "REFUNDED", "CANCELLED"]),
});

export const paymentIntentParamsSchema = z.object({ orderId: z.string().cuid() });
export const refundPaymentSchema = z.object({ reason: z.string().trim().min(3).optional() });
