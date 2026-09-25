import { Response } from "express";
import { AuthenticatedRequest } from "../types/express";
import { asyncHandler } from "../utils/asyncHandler";
import { marketplacePaymentService as service } from "../services/marketplace-payment.service";
import { paymentWebhookSchema } from "../validators/marketplace-payment.validator";

export class MarketplacePaymentController {
  createIntent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId, provider, returnUrl } = req.body;
    const data = await service.createIntent(req.user!.id, orderId, provider, returnUrl);
    res.status(201).json({ success: true, message: "Payment intent created", data });
  });

  webhook = asyncHandler(async (req: any, res: Response) => {
    const payload = paymentWebhookSchema.parse(req.body);
    const order = await service.handleWebhook(payload, req.headers["x-payment-signature"] as string | undefined ?? "");
    res.status(200).json({ success: true, message: "Payment webhook processed", data: { orderId: order.orderId, paymentStatus: order.paymentStatus } });
  });

  refund = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const data = await service.refund(req.user!.id, orderId, req.body.reason);
    res.status(200).json({ success: true, message: "Refund processed", data });
  });
}

export const marketplacePaymentController = new MarketplacePaymentController();
