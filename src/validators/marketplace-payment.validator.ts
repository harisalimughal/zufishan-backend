import { z } from "zod";

export const paymentProviderSchema = z.enum(["CARD", "JAZZCASH", "EASYPAISA"]);

export const createPaymentIntentSchema = z.object({
  orderId: z.string().cuid("Invalid order ID"),
  provider: paymentProviderSchema,
  returnUrl: z.string().url().optional(),
});

export const paymentWebhookSchema = z.object({
  paymentReference: z.string().min(1),
  status: z.enum(["PAID", "FAILED", "REFUNDED"]),
  providerTransactionId: z.string().min(1).optional(),
});

export const refundPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});
