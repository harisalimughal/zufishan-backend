import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { marketplacePaymentController as controller } from "../controllers/marketplace-payment.controller";
import { createPaymentIntentSchema } from "../validators/marketplace-payment.validator";

const router = Router();

router.post("/intents", authenticate, validate(createPaymentIntentSchema), controller.createIntent);
router.post("/webhooks/:provider", controller.webhook);

export default router;
