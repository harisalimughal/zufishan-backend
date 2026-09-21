import { MarketplaceProductRepository } from "../repositories/marketplace-product.repository";
import { ApiError } from "../utils/apiError";
import { VendorApprovalStatus } from "@prisma/client";
import crypto from "crypto";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponse,
  ProductQueryFilters,
  PaginatedProductResult,
} from "../types/marketplace-product.types";

const repository = new MarketplaceProductRepository();

/**
 * Service class implementing business logic for Marketplace Products and Categories.
 */
export class MarketplaceProductService {
  /**
   * Helper function to convert product title into a URL-friendly slug appended with a unique timestamp suffix.
   *
   * @param name - Product name string.
   * @returns Formatted slug string (e.g., "organic-ajwa-dates-8120").
   */
  private generateSlug(name: string): string {
    return `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }

  /**
   * Fetches product categories. Automatically seeds a default fallback category in PostgreSQL
   * if no categories currently exist in the database table.
   *
   * @returns List of ProductCategory records.
   */
  async listCategories() {
    const categories = await repository.getAllCategories();
    
    // Auto-seed default fallback category dynamically if database is empty
    if (categories.length === 0) {
      const defaultCategory = await repository.createCategory({
        name: "General",
        slug: "general",
        description: "General Marketplace Category",
      });
      return [defaultCategory];
    }

    return categories;
  }

  async createCategory(data: { name: string; slug: string; description?: string; parentId?: string | null }) {
    if (data.parentId && !(await repository.getCategoryById(data.parentId))) {
      throw new ApiError(404, "Parent category not found");
    }
    return repository.saveCategory(data);
  }

  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string; parentId?: string | null }) {
    const category = await repository.getCategoryById(id);
    if (!category) throw new ApiError(404, "Category not found");
    if (data.parentId) {
      if (data.parentId === id) throw new ApiError(400, "A category cannot be its own parent");
      const visited = new Set<string>([id]);
      let currentId: string | null = data.parentId;
      while (currentId) {
        if (visited.has(currentId)) throw new ApiError(400, "Category hierarchy cycle detected");
        visited.add(currentId);
        const parent = await repository.getCategoryById(currentId);
        if (!parent) throw new ApiError(404, "Parent category not found");
        currentId = parent.parentId;
      }
    }
    return repository.saveCategory({ id, ...data });
  }

  /**
   * Creates a new product for a vendor.
   * Enforces validation: The user must have a Vendor profile, and approvalStatus MUST be "APPROVED".
   *
   * @param userId - Authenticated user ID.
   * @param data - Validated product payload.
   * @returns Newly created Product response object.
   */
  async createProduct(userId: string, data: CreateProductDto): Promise<ProductResponse> {
    const vendorProfile = await repository.getVendorProfileByUserId(userId);
    
    if (!vendorProfile) {
      throw new ApiError(404, "Vendor profile not found");
    }

    // Business Logic Check: Reject creation if vendor is not approved by Admin
    if (vendorProfile.approvalStatus !== VendorApprovalStatus.APPROVED) {
      throw new ApiError(403, "Vendor account is pending Admin approval");
    }

    const slug = this.generateSlug(data.name);

    return (await repository.createProduct({
      ...data,
      vendorId: vendorProfile.id,
      slug,
    })) as unknown as ProductResponse;
  }

  /**
   * Updates an existing product record after verifying vendor ownership permissions.
   *
   * @param userId - Authenticated user ID.
   * @param productId - Product ID to update.
   * @param data - Updated fields.
   * @returns Updated Product record.
   */
  async updateProduct(userId: string, productId: string, data: UpdateProductDto): Promise<ProductResponse> {
    const vendorProfile = await repository.getVendorProfileByUserId(userId);
    if (!vendorProfile) throw new ApiError(404, "Vendor profile not found");

    const product = await repository.getVendorProductById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    // Ownership Authorization Check
    if (product.vendorId !== vendorProfile.id) {
      throw new ApiError(403, "You do not have permission to update this product");
    }

    const merged = { ...product, ...data };
    if (merged.discountPrice !== undefined && merged.discountPrice !== null && Number(merged.discountPrice) > Number(merged.price)) {
      throw new ApiError(400, "Discount price cannot exceed the product price");
    }
    return (await repository.updateProduct(productId, data)) as unknown as ProductResponse;
  }

  /**
   * Deletes a product record after checking vendor ownership.
   *
   * @param userId - Authenticated user ID.
   * @param productId - Product ID to delete.
   * @returns Deleted Product record.
   */
  async deleteProduct(userId: string, productId: string): Promise<ProductResponse> {
    const vendorProfile = await repository.getVendorProfileByUserId(userId);
    if (!vendorProfile) throw new ApiError(404, "Vendor profile not found");

    const product = await repository.getVendorProductById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    // Ownership Authorization Check
    if (product.vendorId !== vendorProfile.id) {
      throw new ApiError(403, "You do not have permission to delete this product");
    }

    return (await repository.deleteProduct(productId)) as unknown as ProductResponse;
  }

  /**
   * Lookup product by either CUID ID or URL slug string.
   *
   * @param identifier - Product ID or slug string.
   * @returns Product object or null if not found.
   */
  async getProductByIdOrSlug(identifier: string): Promise<ProductResponse | null> {
    const byId = await repository.getProductById(identifier);
    if (byId) return byId as unknown as ProductResponse;
    return (await repository.getProductBySlug(identifier)) as unknown as ProductResponse;
  }

  /**
   * List paginated active products for store view.
   *
   * @param filters - Query filters.
   * @returns Paginated product result list.
   */
  async listProducts(filters: ProductQueryFilters): Promise<PaginatedProductResult> {
    return await repository.getAllProducts(filters);
  }

  /**
   * Fetch all products published by the currently authenticated vendor.
   *
   * @param userId - Authenticated vendor user ID.
   * @returns Array of vendor products.
   */
  async listVendorProducts(userId: string): Promise<ProductResponse[]> {
    const vendorProfile = await repository.getVendorProfileByUserId(userId);
    if (!vendorProfile) throw new ApiError(404, "Vendor profile not found");
    return (await repository.getProductsByVendor(vendorProfile.id)) as unknown as ProductResponse[];
  }
}

export const marketplaceProductService = new MarketplaceProductService();
