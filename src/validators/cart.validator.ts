// src/validators/cart.validator.ts
// Cart Validator – validates add‑to‑cart requests.

import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().cuid("Invalid product ID."),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0."),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0."),
});

export const cartItemIdSchema = z.object({
  itemId: z.string().cuid("Invalid cart item ID."),
});
