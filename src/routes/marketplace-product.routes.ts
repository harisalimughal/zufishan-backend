import { Router } from "express";
import { MarketplaceProductController } from "../controllers/marketplace-product.controller";

const router = Router();
const controller = new MarketplaceProductController();

// ============================================================================
// PUBLIC MARKETPLACE ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/marketplace/products
 * @desc    Fetch paginated list of active store products
 * @access  Public
 */
router.get("/", controller.listProducts);

/**
 * @route   GET /api/marketplace/products/:productId
 * @desc    Fetch a single product by ID or URL slug string
 * @access  Public
 */
router.get("/:productId", controller.getProduct);

export default router;
