import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  shortDescription: z.string().max(250).optional(),
  categoryId: z.string().cuid("Category ID must be a valid CUID"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  discountPrice: z.coerce.number().positive("Discount price must be greater than 0").optional(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  sku: z.string().max(80).optional(),
  imageUrl: z.string().url("Invalid image URL").optional(),
  isActive: z.boolean().optional(),
});

const discountIsNotGreaterThanPrice = (data: { price?: number; discountPrice?: number }) =>
  data.discountPrice === undefined || data.price === undefined || data.discountPrice <= data.price;

// Create Product Schema (Validates directly against req.body)
export const createProductSchema = productSchema.refine(
  discountIsNotGreaterThanPrice,
  {
    message: "Discount price cannot exceed price",
    path: ["discountPrice"],
  }
);

// Update Product Schema
export const updateProductSchema = productSchema.partial().refine(
  discountIsNotGreaterThanPrice,
  {
    message: "Discount price cannot exceed price",
    path: ["discountPrice"],
  }
);

// Product ID Param Schema
export const productIdSchema = z.object({
  productId: z.string().cuid("Invalid product ID format"),
});
