import { Response } from "express";
import { AuthenticatedRequest } from "../types/express";
import { asyncHandler } from "../utils/asyncHandler";
import { marketplaceExtensionService as service } from "../services/marketplace-extension.service";

export class MarketplaceExtensionController {
  private param(req: AuthenticatedRequest, name: string): string {
    const value = req.params[name];
    return Array.isArray(value) ? value[0] : value;
  }

  listCategories = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await service.listCategories() });
  });

  createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.status(201).json({ success: true, data: await service.createCategory(req.body) });
  });

  updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await service.updateCategory(this.param(req, "categoryId"), req.body) });
  });

  deactivateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, message: "Category deactivated successfully", data: await service.deactivateCategory(this.param(req, "categoryId")) });
  });

  listRatings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await service.listRatings(this.param(req, "productId")) });
  });

  createRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.status(201).json({ success: true, data: await service.createRating(req.user!.id, this.param(req, "productId"), req.body) });
  });

  updateRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await service.updateRating(req.user!.id, this.param(req, "ratingId"), req.body) });
  });

  deleteRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await service.deleteRating(req.user!.id, this.param(req, "ratingId"));
    res.json({ success: true, message: "Rating deleted successfully" });
  });
}

export const marketplaceExtensionController = new MarketplaceExtensionController();
