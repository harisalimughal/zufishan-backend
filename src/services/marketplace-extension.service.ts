import { ApiError } from "../utils/apiError";
import { marketplaceExtensionRepository as repository } from "../repositories/marketplace-extension.repository";

export class MarketplaceExtensionService {
  async listCategories() {
    return repository.listCategories();
  }

  async createCategory(data: any) {
    if (await repository.findCategoryBySlug(data.slug)) {
      throw new ApiError(409, "A category with this slug already exists");
    }
    if (data.parentId && !(await repository.findCategory(data.parentId))) {
      throw new ApiError(404, "Parent category not found");
    }
    return repository.createCategory(data);
  }

  async updateCategory(categoryId: string, data: any) {
    const category = await repository.findCategory(categoryId);
    if (!category) throw new ApiError(404, "Category not found");
    if (data.slug && await repository.findCategoryBySlug(data.slug, categoryId)) {
      throw new ApiError(409, "A category with this slug already exists");
    }
    if (data.parentId === categoryId) {
      throw new ApiError(400, "A category cannot be its own parent");
    }
    if (data.parentId && !(await repository.findCategory(data.parentId))) {
      throw new ApiError(404, "Parent category not found");
    }
    return repository.updateCategory(categoryId, data);
  }

  async deactivateCategory(categoryId: string) {
    const category = await repository.findCategory(categoryId);
    if (!category) throw new ApiError(404, "Category not found");
    return repository.updateCategory(categoryId, { isActive: false });
  }

  async listRatings(productId: string) {
    return repository.listRatings(productId);
  }

  async createRating(userId: string, productId: string, data: any) {
    const buyer = await this.getBuyer(userId);
    if (!(await repository.findDeliveredPurchase(buyer.id, productId))) {
      throw new ApiError(403, "A delivered purchase is required to rate this product");
    }
    if (await repository.findBuyerRating(buyer.id, productId)) {
      throw new ApiError(409, "You have already rated this product");
    }
    return repository.createRating({ ...data, buyerId: buyer.id, productId });
  }

  async updateRating(userId: string, ratingId: string, data: any) {
    const buyer = await this.getBuyer(userId);
    const rating = await repository.findRating(ratingId);
    if (!rating) throw new ApiError(404, "Rating not found");
    if (rating.buyerId !== buyer.id) throw new ApiError(403, "You can only update your own rating");
    return repository.updateRating(ratingId, data);
  }

  async deleteRating(userId: string, ratingId: string) {
    const buyer = await this.getBuyer(userId);
    const rating = await repository.findRating(ratingId);
    if (!rating) throw new ApiError(404, "Rating not found");
    if (rating.buyerId !== buyer.id) throw new ApiError(403, "You can only delete your own rating");
    return repository.deleteRating(ratingId);
  }

  private async getBuyer(userId: string) {
    const user = await prismaBuyer(userId);
    if (!user) throw new ApiError(403, "Buyer access required");
    return user;
  }
}

import prisma from "../config/prisma";
const prismaBuyer = (userId: string) => prisma.buyerProfile.findUnique({ where: { userId } });

export const marketplaceExtensionService = new MarketplaceExtensionService();
