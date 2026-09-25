import { Router } from "express";
import { MarketplaceProductController } from "../controllers/marketplace-product.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireVendorOwner } from "../middlewares/vendor.middleware";
import { validate } from "../middlewares/validate.middleware";
import { requireAdmin } from "../middlewares/admin.middleware";
import { categoryIdSchema, createCategorySchema, updateCategorySchema } from "../validators/marketplace-category.validator";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productQuerySchema,
} from "../validators/marketplace-product.validator";

const router = Router();
const controller = new MarketplaceProductController();

// ============================================================================
// PUBLIC MARKETPLACE ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/marketplace/categories
 * @desc    Fetch list of available product categories (Dynamic fallback)
 * @access  Public
 */
router.get("/categories", controller.listCategories);
router.post("/categories", authenticate, requireAdmin, validate(createCategorySchema), controller.createCategory);
router.patch("/categories/:id", authenticate, requireAdmin, validate(categoryIdSchema, "params"), validate(updateCategorySchema), controller.updateCategory);

/**
 * @route   GET /api/marketplace/products
 * @desc    Fetch paginated list of active store products
 * @access  Public
 */
router.get("/", validate(productQuerySchema, "query"), controller.listProducts);

/**
 * @route   GET /api/marketplace/products/vendor/me
 * @desc    Fetch products belonging to the logged-in vendor
 * @access  Protected (Vendor Token)
 */
router.get("/vendor/me", authenticate, controller.listVendorProducts);

/**
 * @route   GET /api/marketplace/products/:idOrSlug
 * @desc    Fetch a single product by ID or URL slug string
 * @access  Public
 * @note    Declared AFTER static named routes to prevent parameter capturing collisions
 */
router.get("/:idOrSlug", controller.getProduct);

// ============================================================================
// PROTECTED VENDOR ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/marketplace/products
 * @desc    Create a new product listing (Requires Approved Vendor Status)
 * @access  Protected (Vendor)
 */
router.post(
  "/",
  authenticate,
  validate(createProductSchema),
  controller.createProduct
);

/**
 * @route   PATCH /api/marketplace/products/:id
 * @desc    Update a product listing
 * @access  Protected (Vendor Owner)
 */
router.patch(
  "/:id",
  authenticate,
  requireVendorOwner,
  validate(updateProductSchema),
  controller.updateProduct
);

/**
 * @route   DELETE /api/marketplace/products/:id
 * @desc    Delete a product listing
 * @access  Protected (Vendor Owner)
 */
router.delete(
  "/:id",
  authenticate,
  requireVendorOwner,
  validate(productIdSchema),
  controller.deleteProduct
);

export default router;
