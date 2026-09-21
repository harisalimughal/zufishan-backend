import { Response } from "express";
import { AuthenticatedRequest } from "../types/express";
import { asyncHandler } from "../utils/asyncHandler";
import { marketplaceCartService } from "../services/marketplace-cart.service";

export class MarketplaceCartController {
  getCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const cart = await marketplaceCartService.getCart(userId);
    res.status(200).json({ success: true, data: cart });
  });

  addItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { productId, quantity } = req.body;
    const cart = await marketplaceCartService.addItem(
      userId,
      productId,
      Number(quantity) || 1
    );
    res.status(201).json({ success: true, data: cart });
  });

  removeItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const cartItemId = req.params.itemId as string;
    const cart = await marketplaceCartService.removeItem(userId, cartItemId);
    res.status(200).json({ success: true, data: cart });
  });

  clearCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const result = await marketplaceCartService.clearCart(userId);
    res.status(200).json(result);
  });
}