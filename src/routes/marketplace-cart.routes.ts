import { Router } from "express";
import { MarketplaceCartController } from "../controllers/marketplace-cart.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const controller = new MarketplaceCartController();

// Protected Buyer Cart Routes
router.get("/", authenticate, controller.getCart);
router.post("/items", authenticate, controller.addItem);
router.delete("/items/:itemId", authenticate, controller.removeItem);
router.delete("/", authenticate, controller.clearCart);

export default router;