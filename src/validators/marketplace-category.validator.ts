import { z } from "zod";

export const categoryIdSchema = z.object({
  categoryId: z.string().cuid("Invalid category ID"),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(500).optional(),
  parentId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required to update a category"
);

export const ratingProductIdSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
});

export const ratingIdSchema = z.object({
  ratingId: z.string().cuid("Invalid rating ID"),
});

export const createRatingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const updateRatingSchema = createRatingSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required to update a rating"
);
