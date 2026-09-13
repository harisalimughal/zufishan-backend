// src/services/marketplace-cart.service.ts
import prisma from "../config/prisma";
import { ApiError } from "../utils/apiError";

export class MarketplaceCartService {
  private async assertBuyer(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "BUYER") {
      throw new ApiError(403, "Buyer access required");
    }
  }

  private async getOrCreateCart(userId: string) {
    await this.assertBuyer(userId);

    let buyer = await prisma.buyerProfile.findUnique({ where: { userId } });
    if (!buyer) {
      buyer = await prisma.buyerProfile.create({ data: { userId } });
    }

    let cart = await prisma.cart.findFirst({ where: { buyerId: buyer.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { buyerId: buyer.id } });
    }

    return cart;
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        isActive: true,
        price: true,
        stock: true,
        vendor: { select: { approvalStatus: true } },
      },
    });
    if (!product || !product.isActive || product.vendor.approvalStatus !== "APPROVED") {
      throw new ApiError(404, "Product not found or inactive");
    }
    if (product.stock < quantity) {
      throw new ApiError(400, `Insufficient stock. Available stock: ${product.stock}`);
    }

    const cart = await this.getOrCreateCart(userId);
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });
    const requestedQuantity = (existingItem?.quantity || 0) + quantity;
    if (requestedQuantity > product.stock) {
      throw new ApiError(400, `Insufficient stock. Available stock: ${product.stock}`);
    }

    return await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      update: { quantity: { increment: quantity } },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
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
            vendor: { select: { approvalStatus: true } },
          },
        },
      },
    });

    const visibleItems = items.filter(
      (item) =>
        item.product?.isActive &&
        item.product?.stock >= 0 &&
        item.product?.vendor?.approvalStatus === "APPROVED"
    );

    const categoryTotals: Record<string, number> = {};
    let totalAmount = 0;
    let totalQuantity = 0;

    for (const item of visibleItems) {
      const price = Number(item.product?.discountPrice ?? item.product?.price ?? 0);
      const subtotal = price * item.quantity;
      const categoryName = item.product?.category?.name || "General";

      totalAmount += subtotal;
      totalQuantity += item.quantity;
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + subtotal;
    }

    return {
      cartId: cart.id,
      items: visibleItems,
      categoryTotals,
      totalAmount,
      totalQuantity,
    };
  }

  async updateItem(userId: string, cartItemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        product: {
          select: {
            stock: true,
            isActive: true,
            vendor: { select: { approvalStatus: true } },
          },
        },
      },
    });

    if (!item || item.cartId !== cart.id) {
      throw new ApiError(404, "Cart item not found");
    }
    if (!item.product.isActive || item.product.vendor.approvalStatus !== "APPROVED") {
      throw new ApiError(400, "Product is no longer active");
    }
    if (quantity > item.product.stock) {
      throw new ApiError(400, `Insufficient stock. Available stock: ${item.product.stock}`);
    }

    return await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });
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
