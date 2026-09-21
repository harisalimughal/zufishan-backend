// src/controllers/marketplace-order.controller.ts

import { Response } from "express";
import { AuthenticatedRequest } from "../types/express";
import { asyncHandler } from "../utils/asyncHandler";
import { marketplaceOrderService } from "../services/marketplace-order.service";

export class MarketplaceOrderController {
  checkout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { shippingAddress, paymentMethod } = req.body;
    const order = await marketplaceOrderService.checkoutFromCart(
      userId,
      shippingAddress,
      paymentMethod
    );
    res.status(201).json({ success: true, message: "Order placed successfully", data: order });
  });

  getBuyerOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const orders = await marketplaceOrderService.getBuyerOrders(userId);
    res.status(200).json({ success: true, data: orders });
  });

  getOrderByConfirmationCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = req.params.code as string;
    const order = await marketplaceOrderService.getOrderByConfirmationCode(code, req.user!.id, req.user!.role);
    res.status(200).json({ success: true, data: order });
  });

  cancelOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const cancelledOrder = await marketplaceOrderService.cancelOrder(orderId, userId);
    res.status(200).json({ success: true, message: "Order cancelled and inventory restored", data: cancelledOrder });
  });

  getVendorOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const orders = await marketplaceOrderService.getVendorOrders(userId);
    res.status(200).json({ success: true, data: orders });
  });

  updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = req.params.orderId as string;
    const { status } = req.body;
    const updatedOrder = await marketplaceOrderService.updateOrderStatus(orderId, status, req.user!.id);
    res.status(200).json({ success: true, message: "Order status updated", data: updatedOrder });
  });

  getVendorAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const analytics = await marketplaceOrderService.getVendorAnalytics(userId);
    res.status(200).json({ success: true, data: analytics });
  });

  getAdminOverview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const overview = await marketplaceOrderService.getAdminOverview();
    res.status(200).json({ success: true, data: overview });
  });
}
