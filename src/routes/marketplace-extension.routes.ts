import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createRatingSchema, createReturnRequestSchema } from "../validators/marketplace-extension.validator";
import { MarketplaceExtensionController } from "../controllers/marketplace-extension.controller";

const router = Router();
const controller = new MarketplaceExtensionController();

router.post("/ratings", authenticate, validate(createRatingSchema), controller.createRating);
router.post("/returns", authenticate, validate(createReturnRequestSchema), controller.createReturnRequest);

export default router;
