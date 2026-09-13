// src/types/marketplace-product.types.ts

export interface CreateProductDto {
  name: string;
  description: string;
  shortDescription?: string;
  categoryId: string; // reference to ProductCategory.id
  price: number;
  discountPrice?: number;
  stock: number;
  sku?: string;
  imageUrl?: string; // primary image URL
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  price?: number;
  discountPrice?: number;
  stock?: number;
  sku?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ProductResponse {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  price: number;
  discountPrice?: number;
  stock: number;
  sku?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQueryFilters {
  // optional pagination
  skip?: number;
  take?: number;
  // optional filtering
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isActive?: boolean;
}

export interface PaginatedProductResult {
  items: ProductResponse[];
  total: number;
  skip: number;
  take: number;
}
