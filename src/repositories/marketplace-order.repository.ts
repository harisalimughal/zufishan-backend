// src/repositories/marketplace-order.repository.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import prisma from "../config/prisma";

export class MarketplaceOrderRepository {
  /**
   * Retrieves an active cart with populated product details using buyerId.
   */
  async getCartByBuyerUserId(userId: string) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId } });
    if (!buyer) return null;

    return (prisma as any).cart.findFirst({
      where: { buyerId: buyer.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                vendorId: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Atomic Prisma transaction creating an Order, OrderItems, decrementing stock, and clearing Cart.
   */
  async createOrderFromCart(userId: string, shippingAddress: string, paymentMethod: string) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId } });
    if (!buyer) throw new Error("Buyer profile not found");

    return prisma.$transaction(async (tx: any) => {
      const cartRecord = await tx.cart.findUnique({ where: { buyerId: buyer.id }, select: { id: true } });
      if (!cartRecord) throw new Error("Your shopping cart is empty");
      // Updating the cart row acquires a database row lock until this transaction commits.
      await tx.cart.update({ where: { id: cartRecord.id }, data: { updatedAt: new Date() } });
      const cart = await tx.cart.findUnique({
        where: { id: cartRecord.id },
        include: { items: { include: { product: true } } },
      });
      if (!cart || cart.items.length === 0) throw new Error("Your shopping cart is empty");

      const checkedItems: any[] = [];
      let totalAmount = 0;
      for (const item of cart.items) {
        if (!item.product.isActive) throw new Error(`Product '${item.product.name}' is no longer active`);
        const updated = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new Error(`Insufficient stock for '${item.product.name}'`);
        checkedItems.push(item);
        totalAmount += Number(item.product.price) * item.quantity;
      }

      const order = await tx.order.create({
        data: {
          buyerId: buyer.id,
          totalAmount,
          status: "PENDING",
          paymentMethod,
          shippingAddress,
          items: {
            create: checkedItems.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              priceAtPurchase: item.product.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 2. Format a user-facing confirmation code based on created order ID
      const formattedCode = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${order.id.slice(-6).toUpperCase()}`;

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return {
        ...order,
        confirmationCode: formattedCode,
      };
    });
  }

  /**
   * Retrieves order details by raw ID or formatted confirmation code (e.g. ORD-20260907-1C2D7U).
   */
  async getOrderByConfirmationCodeOrId(identifier: string, access?: { userId: string; role: string }) {
    // Extract trailing 6 characters if user passed a formatted code like 'ORD-20260907-1C2D7U'
    let searchSuffix = identifier;
    if (identifier.startsWith("ORD-") && identifier.includes("-")) {
      const parts = identifier.split("-");
      searchSuffix = parts[parts.length - 1].toLowerCase();
    }

    const accessWhere: any = {};
    if (access?.role === "BUYER") {
      accessWhere.buyer = { userId: access.userId };
    } else if (access?.role === "VENDOR") {
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId: access.userId }, select: { id: true } });
      if (!vendor) return null;
      accessWhere.items = { some: { product: { vendorId: vendor.id } } };
    }

    // Apply ownership before selecting the matching order so an identifier cannot bypass access checks.
    const orders = await (prisma as any).order.findMany({
      where: {
        ...accessWhere,
        OR: [
          { id: identifier },
          { id: { endsWith: searchSuffix } },
        ],
      },
      ...(access?.role === "VENDOR"
        ? {
            select: {
              id: true,
              status: true,
              paymentMethod: true,
              createdAt: true,
              updatedAt: true,
              items: { where: { product: { vendor: { userId: access.userId } } }, include: { product: true } },
            },
          }
        : { include: { items: { include: { product: true } } } }),
    });

    if (!orders || orders.length === 0) return null;

    const matchedOrder = orders[0];
    const formattedCode = `ORD-${new Date(matchedOrder.createdAt).toISOString().slice(0, 10).replace(/-/g, "")}-${matchedOrder.id.slice(-6).toUpperCase()}`;

    return {
      ...matchedOrder,
      confirmationCode: formattedCode,
    };
  }

  /**
   * Retrieves order history for a Buyer.
   */
  async getOrdersByBuyerUserId(userId: string) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId } });
    if (!buyer) return [];

    const orders = await (prisma as any).order.findMany({
      where: { buyerId: buyer.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, images: true, price: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order: any) => ({
      ...order,
      confirmationCode: `ORD-${new Date(order.createdAt).toISOString().slice(0, 10).replace(/-/g, "")}-${order.id.slice(-6).toUpperCase()}`,
    }));
  }

  /**
   * Retrieves order items linked to products belonging to a Vendor.
   */
  async getOrdersByVendorUserId(userId: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return [];

    return (prisma as any).orderItem.findMany({
      where: {
        product: {
          vendorId: vendor.id,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            shippingAddress: true,
            createdAt: true,
          },
        },
        product: {
          select: { id: true, name: true, price: true },
        },
      },
      orderBy: { id: "desc" },
    });
  }

  /**
   * Cancels a PENDING order and restores inventory stock.
   */
  async cancelOrder(orderId: string, buyerUserId: string) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId: buyerUserId } });
    if (!buyer) throw new Error("Buyer profile not found");

    return prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, buyerId: buyer.id },
        include: { items: true },
      });
      if (!order) throw new Error("Order not found or unauthorized");
      if (order.status === "PAID" || order.paymentStatus === "PAID") {
        throw new Error("Paid orders require a gateway refund before cancellation");
      }
      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        throw new Error(`Order cannot be cancelled in status '${order.status}'`);
      }
      const cancelled = await tx.order.updateMany({
        where: { id: orderId, buyerId: buyer.id, status: { in: ["PENDING", "CONFIRMED"] } },
        data: { status: "CANCELLED" },
      });
      if (cancelled.count !== 1) throw new Error("Order was already cancelled or changed state");

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.order.findUnique({ where: { id: orderId } });
    });
  }

  /**
   * Updates an order status.
   */
  async updateOrderStatus(orderId: string, status: string, vendorUserId: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId }, select: { id: true } });
    if (!vendor) throw new Error("Vendor profile not found");
    const updated = await (prisma as any).orderItem.updateMany({
      where: { orderId, product: { vendorId: vendor.id } },
      data: { status },
    });
    if (updated.count === 0) throw new Error("Order not found or unauthorized");
    return (prisma as any).order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        items: { where: { product: { vendorId: vendor.id } }, include: { product: true } },
      },
    });
  }

  /**
   * Calculates vendor metrics.
   */
  async getVendorAnalytics(userId: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) throw new Error("Vendor profile not found");

    const [vendorOrderItems, productCount, lowStockProducts] = await Promise.all([
      (prisma as any).orderItem.findMany({
        where: { product: { vendorId: vendor.id }, order: { paymentStatus: "PAID", status: { not: "CANCELLED" } } },
        include: { product: { select: { price: true } } },
      }),
      prisma.product.count({ where: { vendorId: vendor.id } }),
      prisma.product.findMany({
        where: { vendorId: vendor.id, stock: { lte: 5 } },
        select: { id: true, name: true, stock: true },
      }),
    ]);

    const totalRevenue = (vendorOrderItems as any[]).reduce(
      (sum: number, item: any) =>
        sum + Number(item.priceAtPurchase || item.product?.price || 0) * Number(item.quantity || 0),
      0
    );

    return {
      totalRevenue,
      totalOrdersHandled: new Set(vendorOrderItems.map((item: any) => item.orderId)).size,
      totalProducts: productCount,
      lowStockWarnings: lowStockProducts,
    };
  }

  /**
   * System-wide overview for Admin Dashboard.
   */
  async getAdminMarketplaceOverview() {
    const [totalVendors, pendingVendors, totalBuyers, totalProducts, totalOrders, totalRevenue] =
      await Promise.all([
        prisma.vendorProfile.count(),
        prisma.vendorProfile.count({ where: { approvalStatus: "PENDING" } }),
        prisma.buyerProfile.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.order.aggregate({ where: { paymentStatus: "PAID", status: { not: "CANCELLED" } }, _sum: { totalAmount: true } }),
      ]);

    return {
      totalVendors,
      pendingVendors,
      totalBuyers,
      totalProducts,
      totalOrders,
      totalPlatformRevenue: totalRevenue._sum.totalAmount || 0,
    };
  }

  async getOrderById(id: string, vendorUserId?: string) {
    if (!vendorUserId) return (prisma as any).order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId }, select: { id: true } });
    if (!vendor) return null;
    return (prisma as any).order.findFirst({
      where: { id, items: { some: { product: { vendorId: vendor.id } } } },
      select: {
        id: true, status: true, paymentMethod: true, createdAt: true, updatedAt: true,
        items: { where: { product: { vendorId: vendor.id } }, include: { product: true } },
      },
    });
  }
}

export const marketplaceOrderRepository = new MarketplaceOrderRepository();
