import prisma from "../config/prisma";

export class MarketplaceCartRepository {
  async getBuyerProfileByUserId(userId: string) {
    return prisma.buyerProfile.findUnique({
      where: { userId },
    });
  }

  async createBuyerProfile(userId: string) {
    return prisma.buyerProfile.create({
      data: { userId },
    });
  }

  async getCartByBuyerId(buyerId: string) {
    return prisma.cart.findFirst({
      where: { buyerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { where: { isPrimary: true } },
              },
            },
          },
        },
      },
    });
  }

  async createCart(buyerId: string) {
    return prisma.cart.create({
      data: { buyerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { where: { isPrimary: true } },
              },
            },
          },
        },
      },
    });
  }

  async findCartItem(cartId: string, productId: string) {
    return prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });
  }

  async addCartItem(cartId: string, productId: string, quantity: number) {
    return prisma.cartItem.create({
      data: {
        cartId,
        productId,
        quantity,
      },
    });
  }

  async updateCartItemQuantity(cartItemId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });
  }

  async removeCartItem(cartItemId: string) {
    return prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  async clearCart(cartId: string) {
    return prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }
}