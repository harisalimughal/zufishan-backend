import { z } from "zod";

export const createRatingSchema = z.object({
  productId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const createReturnRequestSchema = z.object({
  orderItemId: z.string().cuid(),
  reason: z.string().trim().min(3).max(1000),
});
