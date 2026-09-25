import { marketplaceExtensionRepository } from "../repositories/marketplace-extension.repository";
import prisma from "../config/prisma";
import { ApiError } from "../utils/apiError";

export class MarketplaceExtensionService {
  async createRating(userId: string, data: { productId: string; rating: number; comment?: string }) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!buyer) throw new ApiError(404, "Buyer profile not found");
    const product = await prisma.product.findFirst({ where: { id: data.productId, isActive: true }, select: { id: true } });
    if (!product) throw new ApiError(404, "Product not found");
    return marketplaceExtensionRepository.createRating(buyer.id, data);
  }

  async createReturnRequest(userId: string, data: { orderItemId: string; reason: string }) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!buyer) throw new ApiError(404, "Buyer profile not found");
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: data.orderItemId, order: { buyerId: buyer.id } },
      select: { id: true },
    });
    if (!orderItem) throw new ApiError(404, "Order item not found");
    return marketplaceExtensionRepository.createReturnRequest(buyer.id, data);
  }
}

export const marketplaceExtensionService = new MarketplaceExtensionService();
