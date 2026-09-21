// src/validators/cart.validator.ts
// Cart Validator – validates add‑to‑cart requests.

import { z } from "zod";

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().cuid(),
    quantity: z.number().int().positive(),
  }),
});

export const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().positive(),
  }),
});

export const cartItemIdSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid cart item ID."),
  }),
});
