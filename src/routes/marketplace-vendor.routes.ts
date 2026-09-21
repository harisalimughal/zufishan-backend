import { Router } from "express";

import { MarketplaceVendorController } from "../controllers/marketplace-vendor.controller";

import { authenticate } from "../middlewares/auth.middleware";

import { requireAdmin } from "../middlewares/admin.middleware";

import { requireVendorOwner } from "../middlewares/vendor.middleware";

import { validate } from "../middlewares/validate.middleware";

import {
  updateVendorSchema,
  rejectVendorSchema,
} from "../validators/marketplace-vendor.validator";

const router = Router();

const controller = new MarketplaceVendorController();

/*
 * Get all vendors.
 *
 * Only administrators can access this endpoint.
 *
 * GET /api/marketplace/vendors
 */
router.get(
  "/",
  authenticate,
  requireAdmin,
  controller.getAllVendors
);

/*
 * Get all pending vendors.
 *
 * Only administrators can access this endpoint.
 *
 * GET /api/marketplace/vendors/pending
 */
router.get(
  "/pending",
  authenticate,
  requireAdmin,
  controller.getPendingVendors
);

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

/*
 * Approve vendor.
 *
 * Only administrators can approve vendors.
 *
 * PATCH /api/marketplace/vendors/:vendorId/approve
 */
router.patch(
  "/:vendorId/approve",
  authenticate,
  requireAdmin,
  controller.approveVendor
);

/*
 * Reject vendor.
 *
 * Only administrators can reject vendors.
 *
 * PATCH /api/marketplace/vendors/:vendorId/reject
 */
router.patch(
  "/:vendorId/reject",
  authenticate,
  requireAdmin,
  validate(rejectVendorSchema),
  controller.rejectVendor
);

export default router;