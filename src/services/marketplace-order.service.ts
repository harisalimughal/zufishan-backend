// src/services/marketplace-order.service.ts

import { marketplaceOrderRepository } from "../repositories/marketplace-order.repository";
import { ApiError } from "../utils/apiError";

const vendorOrderStatuses = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
const orderTransitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED"],
  CONFIRMED: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
const terminalReturnOrderStatuses = ["DELIVERED"];

type AuthUser = {
  id: string;
  role: string;
};

export class MarketplaceOrderService {
  /**
   * Validates cart stock and executes the checkout transaction.
   */
  async checkoutFromCart(userId: string, shippingAddress: string, paymentMethod: string = "COD") {
    await this.assertBuyer(userId);
    const cart: any = await marketplaceOrderRepository.getCartByBuyerUserId(userId);

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new ApiError(400, "Your shopping cart is empty");
    }

    let totalAmount = 0;
    for (const item of cart.items as any[]) {
      if (!item.product || !item.product.isActive) {
        throw new ApiError(400, `Product '${item.product?.name || "Selected"}' is no longer active`);
      }
      if (item.product.vendor.approvalStatus !== "APPROVED") {
        throw new ApiError(400, `Product '${item.product.name}' is not currently available`);
      }
      if (item.product.stock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for '${item.product.name}'. Available stock: ${item.product.stock}`
        );
      }
      totalAmount += Number(item.product.discountPrice ?? item.product.price) * Number(item.quantity);
    }

    return await marketplaceOrderRepository.createOrderFromCart(
      userId,
      shippingAddress,
      paymentMethod,
      cart.items,
      totalAmount
    );
  }

  async getBuyerOrders(userId: string) {
    await this.assertBuyer(userId);
    return await marketplaceOrderRepository.getOrdersByBuyerUserId(userId);
  }

  async getOrderByConfirmationCode(user: AuthUser, identifier: string) {
    const order = await marketplaceOrderRepository.getOrderByConfirmationCodeOrId(identifier);
    if (!order) {
      throw new ApiError(404, "Order/Booking confirmation code not found");
    }
    await this.assertOrderAccess(user, order.id);
    return order;
  }

  async getOrderDetails(user: AuthUser, orderId: string) {
    await this.assertOrderAccess(user, orderId);
    const order = await marketplaceOrderRepository.getOrderById(orderId);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
    return order;
  }

  async cancelOrder(orderId: string, userId: string, cancellationReason?: string) {
    await this.assertBuyer(userId);
    try {
      return await marketplaceOrderRepository.cancelOrder(orderId, userId, cancellationReason);
    } catch (err: any) {
      throw new ApiError(400, err.message);
    }
  }

  async getVendorOrders(userId: string) {
    const vendor = await marketplaceOrderRepository.getApprovedVendorByUserId(userId);
    if (!vendor) {
      throw new ApiError(403, "Approved vendor access required");
    }
    return await marketplaceOrderRepository.getOrdersByVendorUserId(userId);
  }

  async getVendorReturns(userId: string) {
    const vendor = await marketplaceOrderRepository.getApprovedVendorByUserId(userId);
    if (!vendor) {
      throw new ApiError(403, "Approved vendor access required");
    }
    return await marketplaceOrderRepository.getReturnRequestsByVendorUserId(userId);
  }

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    if (!vendorOrderStatuses.includes(status)) {
      throw new ApiError(400, "Invalid vendor order status");
    }
    const vendor = await marketplaceOrderRepository.getApprovedVendorByUserId(userId);
    if (!vendor) {
      throw new ApiError(403, "Approved vendor access required");
    }
    const order = await marketplaceOrderRepository.getOrderById(orderId);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
    const ownsOrderItem = order.items.some((item: any) => item.product.vendorId === vendor.id);
    if (!ownsOrderItem) {
      throw new ApiError(403, "You do not have permission to update this order");
    }
    if (order.status === "CANCELLED") {
      throw new ApiError(400, "Cancelled orders cannot be updated");
    }
    if (!orderTransitions[order.status]?.includes(status)) {
      throw new ApiError(400, `Order cannot move from '${order.status}' to '${status}'`);
    }
    return await marketplaceOrderRepository.updateOrderStatus(orderId, status);
  }

  async requestReturn(userId: string, orderId: string, orderItemId: string, reason: string) {
    await this.assertBuyer(userId);
    const order = await marketplaceOrderRepository.getBuyerOrderById(userId, orderId);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
    if (!terminalReturnOrderStatuses.includes(order.status)) {
      throw new ApiError(400, `Returns are not allowed for orders in status '${order.status}'`);
    }
    const orderItem = order.items.find((item: any) => item.id === orderItemId);
    if (!orderItem) {
      throw new ApiError(404, "Order item not found");
    }
    try {
      return await marketplaceOrderRepository.createReturnRequest(userId, orderItemId, reason);
    } catch (err: any) {
      throw new ApiError(400, err.message);
    }
  }

  async getOrderReturns(userId: string, orderId: string) {
    await this.assertBuyer(userId);
    const order = await marketplaceOrderRepository.getBuyerOrderById(userId, orderId);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
    return await marketplaceOrderRepository.getReturnRequestsByOrderId(userId, orderId);
  }

  async updateReturnStatus(userId: string, returnRequestId: string, status: string) {
    const vendor = await marketplaceOrderRepository.getApprovedVendorByUserId(userId);
    if (!vendor) {
      throw new ApiError(403, "Approved vendor access required");
    }
    const returnRequest = await marketplaceOrderRepository.getReturnRequestById(returnRequestId);
    if (!returnRequest) {
      throw new ApiError(404, "Return request not found");
    }
    if (returnRequest.orderItem.product.vendorId !== vendor.id) {
      throw new ApiError(403, "You do not have permission to update this return request");
    }
    return await marketplaceOrderRepository.updateReturnStatus(returnRequestId, status);
  }

  async getVendorAnalytics(userId: string) {
    const vendor = await marketplaceOrderRepository.getApprovedVendorByUserId(userId);
    if (!vendor) {
      throw new ApiError(403, "Approved vendor access required");
    }
    return await marketplaceOrderRepository.getVendorAnalytics(userId);
  }

  async getAdminOverview() {
    return await marketplaceOrderRepository.getAdminMarketplaceOverview();
  }

  private async assertOrderAccess(user: AuthUser, orderId: string) {
    if (user.role === "ADMIN") {
      return;
    }
    if (user.role === "BUYER") {
      const order = await marketplaceOrderRepository.getBuyerOrderById(user.id, orderId);
      if (!order) {
        throw new ApiError(404, "Order not found");
      }
      return;
    }
    if (user.role === "VENDOR") {
      const vendor = await marketplaceOrderRepository.getApprovedVendorByUserId(user.id);
      if (!vendor) {
        throw new ApiError(403, "Approved vendor access required");
      }
      const hasAccess = await marketplaceOrderRepository.vendorHasOrder(user.id, orderId);
      if (!hasAccess) {
        throw new ApiError(404, "Order not found");
      }
      return;
    }
    throw new ApiError(403, "Marketplace order access denied");
  }

  private async assertBuyer(userId: string) {
    const buyer = await marketplaceOrderRepository.getBuyerProfileByUserId(userId);
    if (!buyer) {
      throw new ApiError(403, "Buyer access required");
    }
  }
}

export const marketplaceOrderService = new MarketplaceOrderService();
