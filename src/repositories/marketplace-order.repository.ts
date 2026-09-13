// src/repositories/marketplace-order.repository.ts

import prisma from "../config/prisma";

export class MarketplaceOrderRepository {
  async getBuyerProfileByUserId(userId: string) {
    return prisma.buyerProfile.findUnique({ where: { userId } });
  }

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
                discountPrice: true,
                stock: true,
                vendorId: true,
                isActive: true,
                vendor: { select: { approvalStatus: true } },
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
  async createOrderFromCart(
    userId: string,
    shippingAddress: string,
    paymentMethod: string,
    cartItems: any[],
    totalAmount: number
  ) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId } });
    if (!buyer) throw new Error("Buyer profile not found");

    return prisma.$transaction(async (tx: any) => {
      const orderItems = [];
      let recalculatedTotal = 0;

      for (const item of cartItems) {
        const product = await tx.product.findFirst({
          where: {
            id: item.product.id,
            isActive: true,
            vendor: { approvalStatus: "APPROVED" },
          },
          select: {
            id: true,
            name: true,
            price: true,
            discountPrice: true,
            stock: true,
          },
        });

        if (!product || product.stock < item.quantity) {
          throw new Error(`Insufficient stock for '${item.product.name}'`);
        }

        const updated = await tx.product.updateMany({
          where: {
            id: product.id,
            isActive: true,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updated.count !== 1) {
          throw new Error(`Insufficient stock for '${item.product.name}'`);
        }

        const priceAtPurchase = product.discountPrice ?? product.price;
        recalculatedTotal += Number(priceAtPurchase) * Number(item.quantity);
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtPurchase,
        });
      }

      const order = await tx.order.create({
        data: {
          buyerId: buyer.id,
          totalAmount: recalculatedTotal || totalAmount,
          status: "PENDING",
          paymentMethod,
          paymentStatus: paymentMethod === "COD" ? "PENDING" : "PENDING",
          shippingAddress,
          items: {
            create: orderItems,
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

      const formattedCode = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${order.id.slice(-6).toUpperCase()}`;

      const cart = await tx.cart.findFirst({
        where: { buyerId: buyer.id },
      });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return {
        ...order,
        confirmationCode: formattedCode,
      };
    });
  }

  /**
   * Retrieves order details by raw ID or formatted confirmation code (e.g. ORD-20260907-1C2D7U).
   */
  async getOrderByConfirmationCodeOrId(identifier: string) {
    // Extract trailing 6 characters if user passed a formatted code like 'ORD-20260907-1C2D7U'
    let searchSuffix = identifier;
    if (identifier.startsWith("ORD-") && identifier.includes("-")) {
      const parts = identifier.split("-");
      searchSuffix = parts[parts.length - 1].toLowerCase();
    }

    // Fetch all orders matching exact ID or ending with the extracted CUID suffix
    const orders = await (prisma as any).order.findMany({
      where: {
        OR: [
          { id: identifier },
          { id: { endsWith: searchSuffix } },
        ],
      },
      include: { items: { include: { product: true } } },
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
    const vendor = await prisma.vendorProfile.findFirst({
      where: { userId, approvalStatus: "APPROVED" },
    });
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
  async cancelOrder(orderId: string, buyerUserId: string, cancellationReason?: string) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId: buyerUserId } });
    if (!buyer) throw new Error("Buyer profile not found");

    const order = await (prisma as any).order.findFirst({
      where: { id: orderId, buyerId: buyer.id },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found or unauthorized");
    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      throw new Error(`Order cannot be cancelled in status '${order.status}'`);
    }

    return prisma.$transaction(async (tx: any) => {
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancellationReason,
          cancelledAt: new Date(),
        },
      });

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return cancelledOrder;
    });
  }

  /**
   * Updates an order status.
   */
  async updateOrderStatus(orderId: string, status: string) {
    return (prisma as any).order.update({
      where: { id: orderId },
      data: { status },
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
        where: { product: { vendorId: vendor.id } },
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
      totalOrdersHandled: vendorOrderItems.length,
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
        prisma.order.aggregate({ _sum: { totalAmount: true } }),
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

  async getOrderById(id: string) {
    return await (prisma as any).order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  }

  async getBuyerOrderById(userId: string, orderId: string) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId } });
    if (!buyer) return null;

    return await (prisma as any).order.findFirst({
      where: { id: orderId, buyerId: buyer.id },
      include: { items: { include: { product: true, returnRequests: true } } },
    });
  }

  async getApprovedVendorByUserId(userId: string) {
    return await prisma.vendorProfile.findFirst({
      where: { userId, approvalStatus: "APPROVED" },
      select: { id: true },
    });
  }

  async vendorHasOrder(userId: string, orderId: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return false;

    const count = await (prisma as any).orderItem.count({
      where: {
        orderId,
        product: { vendorId: vendor.id },
      },
    });

    return count > 0;
  }

  async createReturnRequest(buyerUserId: string, orderItemId: string, reason: string) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId: buyerUserId } });
    if (!buyer) throw new Error("Buyer profile not found");

    const existing = await (prisma as any).returnRequest.findFirst({
      where: { buyerId: buyer.id, orderItemId },
    });
    if (existing) {
      throw new Error("Return request already exists for this order item");
    }

    return await (prisma as any).returnRequest.create({
      data: {
        buyerId: buyer.id,
        orderItemId,
        reason,
        status: "PENDING",
      },
      include: {
        orderItem: { include: { product: true } },
      },
    });
  }

  async getReturnRequestsByOrderId(buyerUserId: string, orderId: string) {
    const buyer = await prisma.buyerProfile.findUnique({ where: { userId: buyerUserId } });
    if (!buyer) return [];

    return await (prisma as any).returnRequest.findMany({
      where: {
        buyerId: buyer.id,
        orderItem: { orderId },
      },
      include: {
        orderItem: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getReturnRequestById(returnRequestId: string) {
    return await (prisma as any).returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        orderItem: { include: { product: true, order: true } },
      },
    });
  }

  async updateReturnStatus(returnRequestId: string, status: string) {
    return await (prisma as any).returnRequest.update({
      where: { id: returnRequestId },
      data: { status },
      include: {
        orderItem: { include: { product: true } },
      },
    });
  }

  async getReturnRequestsByVendorUserId(userId: string) {
    const vendor = await prisma.vendorProfile.findFirst({
      where: { userId, approvalStatus: "APPROVED" },
      select: { id: true },
    });
    if (!vendor) return [];

    return await (prisma as any).returnRequest.findMany({
      where: {
        orderItem: {
          product: {
            vendorId: vendor.id,
          },
        },
      },
      include: {
        orderItem: {
          include: {
            product: true,
            order: true,
          },
        },
        buyer: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const marketplaceOrderRepository = new MarketplaceOrderRepository();
