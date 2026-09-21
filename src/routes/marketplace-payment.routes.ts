import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../types/express";
import { marketplacePaymentService } from "../services/marketplace-payment.service";
import { paymentWebhookSchema, paymentIntentParamsSchema } from "../validators/marketplace-payment.validator";

const router = Router();

router.post(
  "/:orderId/intent",
  authenticate,
  validate(paymentIntentParamsSchema, "params"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await marketplacePaymentService.createPaymentIntent(String(req.params.orderId), req.user!.id);
    res.status(200).json({ success: true, data: result });
  })
);

router.post(
  "/webhook",
  validate(paymentWebhookSchema),
  asyncHandler(async (req, res) => {
    const result = await marketplacePaymentService.handleWebhook(req.body, req.header("x-payment-signature") ?? "");
    res.status(200).json({ success: true, data: result });
  })
);

export default router;
