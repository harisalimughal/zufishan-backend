// src/routes/marketplace-order.routes.ts

import { Router, Response, NextFunction } from "express";
import { MarketplaceOrderController } from "../controllers/marketplace-order.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { AuthenticatedRequest } from "../types/express";
import { ApiError } from "../utils/apiError";

const router = Router();
const controller = new MarketplaceOrderController();

// Protect all routes
router.use(authenticate);

// Admin authorization guard
const requireAdmin = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new ApiError(403, "Access denied: Admin permissions required"));
  }
  next();
};

// Buyer Endpoints
router.post("/checkout", controller.checkout);
router.get("/buyer", controller.getBuyerOrders);
router.get("/lookup/:code", controller.getOrderByConfirmationCode);
router.patch("/:orderId/cancel", controller.cancelOrder);

// Vendor Endpoints
router.get("/vendor", controller.getVendorOrders);
router.get("/vendor/analytics", controller.getVendorAnalytics);
router.patch("/:orderId/status", controller.updateOrderStatus);

// Admin Endpoints
router.get("/admin/overview", requireAdmin, controller.getAdminOverview);

export default router;