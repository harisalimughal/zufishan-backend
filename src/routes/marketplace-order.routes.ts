// src/routes/marketplace-order.routes.ts

import { Router } from "express";
import { MarketplaceOrderController } from "../controllers/marketplace-order.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  cancelOrderSchema,
  checkoutSchema,
  orderIdSchema,
  returnRequestSchema,
} from "../validators/marketplace-order.validator";

const router = Router();
const controller = new MarketplaceOrderController();

// Protect all routes
router.use(authenticate);

// Buyer Endpoints
router.post("/", validate(checkoutSchema), controller.checkout);
router.get("/", controller.getBuyerOrders);
router.get("/confirmation/:code", controller.getOrderByConfirmationCode);
router.get(
  "/:orderId",
  validate(orderIdSchema, "params"),
  controller.getOrderDetails
);
router.post(
  "/:orderId/cancellation",
  validate(orderIdSchema, "params"),
  validate(cancelOrderSchema),
  controller.cancelOrder
);
router.post(
  "/:orderId/returns",
  validate(orderIdSchema, "params"),
  validate(returnRequestSchema),
  controller.requestReturn
);
router.get(
  "/:orderId/returns",
  validate(orderIdSchema, "params"),
  controller.getOrderReturns
);

export default router;
