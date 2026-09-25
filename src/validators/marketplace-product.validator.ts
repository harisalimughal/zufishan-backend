import { z } from "zod";

// Create Product Schema (Validates directly against req.body)
export const createProductSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  categoryId: z.string().cuid("Category ID must be a valid CUID"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  imageUrl: z.string().url("Invalid image URL").optional(),
  isActive: z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean()).optional(),
});

// Update Product Schema
export const updateProductSchema = createProductSchema.partial();

// Product ID Param Schema
export const productIdSchema = z.object({
  id: z.string().cuid("Invalid product ID format"),
});

const optionalBoolean = z.preprocess(
  (value) => value === "true" ? true : value === "false" ? false : value,
  z.boolean()
);

export const productQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  categoryId: z.string().cuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().trim().max(100).optional(),
  isActive: optionalBoolean.optional(),
}).refine(
  (value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
  { message: "minPrice cannot exceed maxPrice", path: ["minPrice"] }
);
