import { z } from "zod";

export const paymentMethods = ["CARD", "JAZZCASH", "EASYPAISA", "COD"] as const;

export const checkoutSchema = z.object({
  shippingAddress: z.string().min(3, "Shipping address is required"),
  paymentMethod: z.enum(paymentMethods).default("COD"),
});

export const orderIdSchema = z.object({
  orderId: z.string().cuid("Invalid order ID."),
});

export const returnRequestIdSchema = z.object({
  returnRequestId: z.string().cuid("Invalid return request ID."),
});

export const cancelOrderSchema = z.object({
  cancellationReason: z.string().min(3, "Cancellation reason must be at least 3 characters").optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]),
});

export const returnRequestSchema = z.object({
  orderItemId: z.string().cuid("Invalid order item ID."),
  reason: z.string().min(3, "Return reason must be at least 3 characters"),
});

export const updateReturnStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "RECEIVED"]),
});
