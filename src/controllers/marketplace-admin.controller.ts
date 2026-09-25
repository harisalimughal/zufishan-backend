// src/controllers/marketplace-admin.controller.ts

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { marketplaceAdminService } from "../services/marketplace-admin.service";

export class MarketplaceAdminController {
  /** Get marketplace statistics – admin only */
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await marketplaceAdminService.getStats();
    res.json({ success: true, data: stats });
  });
}
