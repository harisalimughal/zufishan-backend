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
    const order = await marketplaceOrderService.getOrderByConfirmationCode(req.user!, code);
    res.status(200).json({ success: true, data: order });
  });

  getOrderDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = req.params.orderId as string;
    const order = await marketplaceOrderService.getOrderDetails(req.user!, orderId);
    res.status(200).json({ success: true, data: order });
  });

  cancelOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const { cancellationReason } = req.body;
    const cancelledOrder = await marketplaceOrderService.cancelOrder(orderId, userId, cancellationReason);
    res.status(200).json({ success: true, message: "Order cancelled and inventory restored", data: cancelledOrder });
  });

  getVendorOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const orders = await marketplaceOrderService.getVendorOrders(userId);
    res.status(200).json({ success: true, data: orders });
  });

  getVendorReturns = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const returns = await marketplaceOrderService.getVendorReturns(userId);
    res.status(200).json({ success: true, data: returns });
  });

  updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const { status } = req.body;
    const updatedOrder = await marketplaceOrderService.updateOrderStatus(userId, orderId, status);
    res.status(200).json({ success: true, message: "Order status updated", data: updatedOrder });
  });

  requestReturn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const { orderItemId, reason } = req.body;
    const returnRequest = await marketplaceOrderService.requestReturn(userId, orderId, orderItemId, reason);
    res.status(201).json({ success: true, message: "Return request submitted", data: returnRequest });
  });

  getOrderReturns = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId as string;
    const returns = await marketplaceOrderService.getOrderReturns(userId, orderId);
    res.status(200).json({ success: true, data: returns });
  });

  updateReturnStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const returnRequestId = req.params.returnRequestId as string;
    const { status } = req.body;
    const returnRequest = await marketplaceOrderService.updateReturnStatus(userId, returnRequestId, status);
    res.status(200).json({ success: true, message: "Return status updated", data: returnRequest });
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
