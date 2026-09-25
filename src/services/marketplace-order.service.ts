// src/services/marketplace-order.service.ts

import { marketplaceOrderRepository } from "../repositories/marketplace-order.repository";
import { ApiError } from "../utils/apiError";
import prisma from "../config/prisma";

export class MarketplaceOrderService {
  /**
   * Validates cart stock and executes the checkout transaction.
   */
  async checkoutFromCart(userId: string, shippingAddress: string, paymentMethod: string = "COD") {
    try {
      return await marketplaceOrderRepository.createOrderFromCart(userId, shippingAddress, paymentMethod);
    } catch (error: any) {
      throw new ApiError(400, error.message);
    }
  }

  async getBuyerOrders(userId: string) {
    return await marketplaceOrderRepository.getOrdersByBuyerUserId(userId);
  }

  async getOrderByConfirmationCode(identifier: string, userId: string, role: string) {
    const order = await marketplaceOrderRepository.getOrderByConfirmationCodeOrId(identifier, { userId, role });
    if (!order) {
      throw new ApiError(404, "Order/Booking confirmation code not found");
    }
    return order;
  }

  async cancelOrder(orderId: string, userId: string) {
    try {
      return await marketplaceOrderRepository.cancelOrder(orderId, userId);
    } catch (err: any) {
      throw new ApiError(400, err.message);
    }
  }

  async getVendorOrders(userId: string) {
    return await marketplaceOrderRepository.getOrdersByVendorUserId(userId);
  }

  async updateOrderStatus(orderId: string, status: string, userId: string) {
    const order = await marketplaceOrderRepository.getOrderById(orderId, userId);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
    return await marketplaceOrderRepository.updateOrderStatus(orderId, status, userId);
  }

  async getVendorAnalytics(userId: string) {
    return await marketplaceOrderRepository.getVendorAnalytics(userId);
  }

  async getAdminOverview() {
    return await marketplaceOrderRepository.getAdminMarketplaceOverview();
  }

  async getOrderDetails(orderId: string, userId: string) {
    const order = await marketplaceOrderRepository.getOrderById(orderId, userId);
    if (!order) throw new ApiError(404, "Order not found");
    return order;
  }

  async getVendorReturns(userId: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");
    return prisma.returnRequest.findMany({ where: { orderItem: { product: { vendorId: vendor.id } } }, include: { orderItem: { include: { product: true } } }, orderBy: { createdAt: "desc" } });
  }

  async updateReturnStatus(returnRequestId: string, status: string, userId: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");
    const updated = await prisma.returnRequest.updateMany({ where: { id: returnRequestId, orderItem: { product: { vendorId: vendor.id } } }, data: { status } });
    if (updated.count !== 1) throw new ApiError(404, "Return request not found");
    return prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
  }
}

export const marketplaceOrderService = new MarketplaceOrderService();
