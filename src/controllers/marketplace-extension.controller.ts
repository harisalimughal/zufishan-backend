import { Response } from "express";
import { AuthenticatedRequest } from "../types/express";
import { asyncHandler } from "../utils/asyncHandler";
import { marketplaceExtensionService } from "../services/marketplace-extension.service";
import { marketplaceProductService } from "../services/marketplace-product.service";

export class MarketplaceExtensionController {
  createRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const rating = await marketplaceExtensionService.createRating(req.user!.id, req.body);
    res.status(201).json({ success: true, data: rating });
  });

  createReturnRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const request = await marketplaceExtensionService.createReturnRequest(req.user!.id, req.body);
    res.status(201).json({ success: true, data: request });
  });

  listCategories = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({ success: true, data: await marketplaceProductService.listCategories() });
  });

  createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.status(201).json({ success: true, data: await marketplaceProductService.createCategory(req.body) });
  });

  updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = (req.params.categoryId ?? req.params.id) as string;
    res.status(200).json({ success: true, data: await marketplaceProductService.updateCategory(id, req.body) });
  });

  deactivateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.categoryId as string;
    res.status(200).json({ success: true, data: await marketplaceProductService.updateCategory(id, { isActive: false } as any) });
  });
}

export const marketplaceExtensionController = new MarketplaceExtensionController();
