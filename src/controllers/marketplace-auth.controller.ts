import { Request, Response } from "express";
import { MarketplaceAuthService } from "../services/marketplace-auth.service";
import { asyncHandler } from "../utils/asyncHandler";
import { authService } from "../services/auth.service";

interface AuthenticatedRequest extends Request {
  user?: any;
}

const service = new MarketplaceAuthService();

export class MarketplaceAuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body.body || req.body;
    const result = await service.register(payload);

    res.status(201).json({
      success: true,
      message: `${payload.role === "VENDOR" ? "Vendor" : "Buyer"} registered successfully`,
      data: result,
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body.body || req.body;
    const result = await service.login(payload);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body.body || req.body;
    const result = await authService.refreshToken(payload.refreshToken);
    res.status(200).json({ success: true, message: "Token refreshed successfully", data: result });
  });

  getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  });
}
