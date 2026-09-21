// src/services/marketplace-order.service.ts

import { marketplaceOrderRepository } from "../repositories/marketplace-order.repository";
import { ApiError } from "../utils/apiError";

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
}

export const marketplaceOrderService = new MarketplaceOrderService();
