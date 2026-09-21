import { Response } from "express";
import { AuthenticatedRequest } from "../types/express";
import { asyncHandler } from "../utils/asyncHandler";
import { marketplaceProductService } from "../services/marketplace-product.service";

/**
 * Controller class managing HTTP Request handlers for Product and Category endpoints.
 */
export class MarketplaceProductController {
  /**
   * HTTP GET /api/marketplace/categories
   * Fetches all available product categories dynamically.
   */
  listCategories = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const categories = await marketplaceProductService.listCategories();
    res.status(200).json({ success: true, data: categories });
  });

  createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const category = await marketplaceProductService.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  });

  updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const category = await marketplaceProductService.updateCategory(req.params.id as string, req.body);
    res.status(200).json({ success: true, data: category });
  });

  /**
   * HTTP POST /api/marketplace/products
   * Creates a new marketplace product. Requires authentication and vendor owner status.
   */
  createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const product = await marketplaceProductService.createProduct(userId, req.body);
    res.status(201).json({ success: true, data: product });
  });

  /**
   * HTTP GET /api/marketplace/products/:idOrSlug
   * Fetches a single product by its database ID or slug string.
   */
  getProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const identifier = req.params.idOrSlug as string;
    const product = await marketplaceProductService.getProductByIdOrSlug(identifier);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.status(200).json({ success: true, data: product });
  });

  /**
   * HTTP GET /api/marketplace/products
   * Public list endpoint returning paginated active products matching query filters.
   */
  listProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await marketplaceProductService.listProducts(req.query as any);
    res.status(200).json({ success: true, data: result });
  });

  /**
   * HTTP GET /api/marketplace/products/vendor/me
   * Protected endpoint returning products owned by the authenticated vendor.
   */
  listVendorProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const products = await marketplaceProductService.listVendorProducts(userId);
    res.status(200).json({ success: true, data: products });
  });

  /**
   * HTTP PATCH /api/marketplace/products/:id
   * Updates an existing product owned by the vendor.
   */
  updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const productId = req.params.id as string;
    const product = await marketplaceProductService.updateProduct(userId, productId, req.body);
    res.status(200).json({ success: true, data: product });
  });

  /**
   * HTTP DELETE /api/marketplace/products/:id
   * Removes a product owned by the vendor.
   */
  deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const productId = req.params.id as string;
    await marketplaceProductService.deleteProduct(userId, productId);
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  });
}
