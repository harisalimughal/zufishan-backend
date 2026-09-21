import { z } from "zod";

export const categoryIdSchema = z.object({ id: z.string().cuid() });
export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).optional(),
  parentId: z.string().cuid().nullable().optional(),
});
export const updateCategorySchema = createCategorySchema.partial();
