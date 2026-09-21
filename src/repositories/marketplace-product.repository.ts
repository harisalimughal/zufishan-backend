import { Prisma } from "@prisma/client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "../config/prisma";
import { ProductQueryFilters, PaginatedProductResult } from "../types/marketplace-product.types";

/**
 * Repository class handling database transactions for Marketplace Products and Categories.
 * Utilizes Prisma Client for PostgreSQL data access.
 */
export class MarketplaceProductRepository {
  /**
   * Retrieves a vendor profile associated with a specific User ID.
   * Used to check authorization and vendor approval status.
   *
   * @param userId - The unique ID of the user.
   * @returns Vendor profile data containing id, approvalStatus, and businessName.
   */
  async getVendorProfileByUserId(userId: string) {
    return prisma.vendorProfile.findUnique({
      where: { userId },
      select: { id: true, approvalStatus: true, businessName: true },
    });
  }

  /**
   * Fetches all product categories currently available in the database.
   *
   * @returns Array of ProductCategory objects.
   */
  async getAllCategories() {
    return prisma.productCategory.findMany({
      orderBy: { name: "asc" },
    });
  }

  /**
   * Dynamically seeds or creates a product category in PostgreSQL.
   * Uses upsert based on the unique 'slug' field to avoid duplicate entry errors.
   *
   * @param data - Category payload containing name, slug, and optional description.
   * @returns The created or existing ProductCategory record.
   */
  async createCategory(data: { name: string; slug: string; description?: string }) {
    return prisma.productCategory.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        name: data.name,
        slug: data.slug,
        description: data.description || "Default category",
      },
    });
  }

  /**
   * Inserts a new product into the database and connects it to its respective Vendor and Category records.
   *
   * @param data - Product attributes including vendorId, categoryId, pricing, stock, and imageUrl.
   * @returns Created Product record including relation images and vendor details.
   */
  async createProduct(data: {
    vendorId: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    price: number;
    discountPrice?: number;
    stock: number;
    sku?: string;
    imageUrl?: string;
    isActive?: boolean;
  }) {
    const { imageUrl, categoryId, vendorId, ...rest } = data;

    // Prepare relational connections for Prisma create input
    const createPayload: any = {
      ...rest,
      isActive: rest.isActive ?? true,
      vendor: { connect: { id: vendorId } },
      category: { connect: { id: categoryId } },
    };

    // Attach primary product image if provided
    if (imageUrl) {
      createPayload.images = {
        create: [
          {
            imageUrl,
            isPrimary: true,
          },
        ],
      };
    }

    return prisma.product.create({
      data: createPayload,
      include: {
        images: true,
        category: true,
        vendor: { select: { id: true, businessName: true } },
      },
    });
  }

  /**
   * Retrieves a product by its unique database CUID ID.
   *
   * @param id - Unique Product ID.
   * @returns Detailed Product record with relational category, images, and vendor profiles.
   */
  async getProductById(id: string) {
    return prisma.product.findUnique({
      where: { id, isActive: true },
      include: {
        images: true,
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            approvalStatus: true,
          },
        },
      },
    });
  }

  async getCategoryById(id: string) {
    return prisma.productCategory.findUnique({ where: { id }, select: { id: true, parentId: true } });
  }

  async saveCategory(data: { id?: string; name?: string; slug?: string; description?: string; parentId?: string | null }) {
    const { id, parentId, ...fields } = data;
    if (id) {
      return prisma.productCategory.update({ where: { id }, data: { ...fields, ...(parentId !== undefined ? { parent: parentId ? { connect: { id: parentId } } : { disconnect: true } } : {}) } });
    }
    if (!fields.name || !fields.slug) throw new Error("Category name and slug are required");
    const createData: Prisma.ProductCategoryCreateInput = {
      name: fields.name,
      slug: fields.slug,
      ...(fields.description !== undefined ? { description: fields.description } : {}),
      ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
    };
    return prisma.productCategory.create({ data: createData });
  }

  async getVendorProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
        vendor: { select: { id: true, businessName: true, approvalStatus: true } },
      },
    });
  }

  /**
   * Retrieves a product by its unique URL-friendly slug string.
   *
   * @param slug - URL slug string.
   * @returns Detailed Product record.
   */
  async getProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        images: true,
        category: true,
        vendor: { select: { id: true, businessName: true } },
      },
    });
  }

  /**
   * Fetches a paginated, filtered list of active products for store search and browsing.
   *
   * @param filters - Filtering parameters (skip, take, search query, price ranges, categoryId).
   * @returns Paginated result object containing product items, total count, skip, and take parameters.
   */
  async getAllProducts(filters: ProductQueryFilters): Promise<PaginatedProductResult> {
    const skip = Number(filters.skip) || 0;
    const take = Number(filters.take) || 10;

    // Construct Prisma dynamic WHERE query block
    const where: Prisma.ProductWhereInput = {
      isActive: filters.isActive !== undefined ? filters.isActive : true,
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.minPrice || filters.maxPrice
        ? {
            price: {
              ...(filters.minPrice && { gte: filters.minPrice }),
              ...(filters.maxPrice && { lte: filters.maxPrice }),
            },
          }
        : {}),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    };

    // Execute list fetch and total count query concurrently
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          images: true,
          category: true,
          vendor: { select: { id: true, businessName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: items as any,
      total,
      skip,
      take,
    };
  }

  /**
   * Updates an existing product record in the database.
   *
   * @param id - Unique Product ID.
   * @param data - Updated product attributes.
   * @returns Updated Product record.
   */
  async updateProduct(id: string, data: any) {
    const { imageUrl, categoryId, ...rest } = data;

    const updatePayload: any = {
      ...rest,
      ...(categoryId && { category: { connect: { id: categoryId } } }),
    };

    if (imageUrl) {
      updatePayload.images = {
        deleteMany: {},
        create: [{ imageUrl, isPrimary: true }],
      };
    }

    return prisma.product.update({
      where: { id },
      data: updatePayload,
      include: { images: true, category: true },
    });
  }

  /**
   * Removes a product record from PostgreSQL database by ID.
   *
   * @param id - Unique Product ID.
   * @returns Deleted Product record.
   */
  async deleteProduct(id: string) {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Retrieves all products associated with a specific Vendor Profile ID.
   *
   * @param vendorId - Unique Vendor Profile ID.
   * @returns Array of Products belonging to the specified vendor.
   */
  async getProductsByVendor(vendorId: string) {
    return prisma.product.findMany({
      where: { vendorId },
      include: { images: true, category: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
