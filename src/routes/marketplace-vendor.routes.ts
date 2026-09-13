import { Router } from "express";

import { MarketplaceVendorController } from "../controllers/marketplace-vendor.controller";

import { authenticate } from "../middlewares/auth.middleware";

import { requireVendorOwner } from "../middlewares/vendor.middleware";

import { validate } from "../middlewares/validate.middleware";

import { updateVendorSchema } from "../validators/marketplace-vendor.validator";

const router = Router();

const controller = new MarketplaceVendorController();

/*
 * Get a single vendor by ID.
 *
 * Authentication is required.
 *
 * GET /api/marketplace/vendors/:vendorId
 */
router.get(
  "/:vendorId",
  authenticate,
  controller.getVendorById
);

/*
 * Update vendor profile.
 *
 * Only the owner of the vendor profile
 * can update it.
 *
 * PATCH /api/marketplace/vendors/:vendorId
 */
router.patch(
  "/:vendorId",
  authenticate,
  requireVendorOwner,
  validate(updateVendorSchema),
  controller.updateVendor
);

export default router;
