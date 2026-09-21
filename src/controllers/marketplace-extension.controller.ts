import { Response } from "express";
import { AuthenticatedRequest } from "../types/express";
import { asyncHandler } from "../utils/asyncHandler";
import { marketplaceExtensionService } from "../services/marketplace-extension.service";

export class MarketplaceExtensionController {
  createRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const rating = await marketplaceExtensionService.createRating(req.user!.id, req.body);
    res.status(201).json({ success: true, data: rating });
  });

  createReturnRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const request = await marketplaceExtensionService.createReturnRequest(req.user!.id, req.body);
    res.status(201).json({ success: true, data: request });
  });
}
