// src/services/marketplace-cart.service.ts
import prisma from "../config/prisma";
import { ApiError } from "../utils/apiError";

export class MarketplaceCartService {
  private async getOrCreateCart(userId: string) {
    return prisma.$transaction(async (tx) => {
      const buyer = await tx.buyerProfile.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
      return tx.cart.upsert({
        where: { buyerId: buyer.id },
        update: {},
        create: { buyerId: buyer.id },
      });
    });
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { isActive: true, price: true },
    });
    if (!product || !product.isActive) {
      throw new ApiError(404, "Product not found or inactive");
    }

    return prisma.$transaction(async (tx) => {
      const buyer = await tx.buyerProfile.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
      const cart = await tx.cart.upsert({
        where: { buyerId: buyer.id },
        update: {},
        create: { buyerId: buyer.id },
      });
      const existing = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
      const requestedQuantity = (existing?.quantity ?? 0) + quantity;
      const available = await tx.product.findFirst({
        where: { id: productId, isActive: true, stock: { gte: requestedQuantity } },
        select: { id: true },
      });
      if (!available) throw new ApiError(400, "Requested quantity exceeds available stock");

      return tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        update: { quantity: requestedQuantity },
        create: { cartId: cart.id, productId, quantity },
      });
    }, { isolationLevel: "Serializable" });
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const items = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            category: true,
            images: { where: { isPrimary: true } },
          },
        },
      },
    });

    const categoryTotals: Record<string, number> = {};
    let totalAmount = 0;
    let totalQuantity = 0;

    for (const item of items) {
      const price = Number(item.product?.discountPrice ?? item.product?.price ?? 0);
      const subtotal = price * item.quantity;
      const categoryName = item.product?.category?.name || "General";

      totalAmount += subtotal;
      totalQuantity += item.quantity;
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + subtotal;
    }

    return {
      cartId: cart.id,
      items,
      categoryTotals,
      totalAmount,
      totalQuantity,
    };
  }

  async updateItem(userId: string, cartItemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });

    if (!item || item.cartId !== cart.id) {
      throw new ApiError(404, "Cart item not found");
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.cartItem.findUnique({
        where: { id: cartItemId },
        include: { product: { select: { stock: true, isActive: true } } },
      });
      if (!product || !product.product.isActive || product.product.stock < quantity) {
        throw new ApiError(400, "Requested quantity exceeds available stock");
      }
      return tx.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
    }, { isolationLevel: "Serializable" });
  }

  async removeItem(userId: string, cartItemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });

    if (!item || item.cartId !== cart.id) {
      throw new ApiError(404, "Cart item not found");
    }

    return await prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}

export const marketplaceCartService = new MarketplaceCartService();
