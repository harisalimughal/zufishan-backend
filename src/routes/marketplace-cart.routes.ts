import { Router } from "express";
import { MarketplaceCartController } from "../controllers/marketplace-cart.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  addToCartSchema,
  cartItemIdSchema,
  updateCartItemSchema,
} from "../validators/cart.validator";

const router = Router();
const controller = new MarketplaceCartController();

// Protected Buyer Cart Routes
router.get("/", authenticate, controller.getCart);
router.post("/items", authenticate, validate(addToCartSchema), controller.addItem);
router.patch(
  "/items/:itemId",
  authenticate,
  validate(cartItemIdSchema, "params"),
  validate(updateCartItemSchema),
  controller.updateItem
);
router.delete(
  "/items/:itemId",
  authenticate,
  validate(cartItemIdSchema, "params"),
  controller.removeItem
);
router.delete("/", authenticate, controller.clearCart);

export default router;
