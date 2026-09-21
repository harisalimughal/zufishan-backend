import { Request, Response } from "express";
import { MarketplaceVendorService } from "../services/marketplace-vendor.service";
import { asyncHandler } from "../utils/asyncHandler";

const service = new MarketplaceVendorService();

export class MarketplaceVendorController {

  /*
   * Get a single vendor by vendor ID.
   *
   * Route:
   * GET /api/marketplace/vendors/:vendorId
   */
  getVendorById = asyncHandler(
    async (req: Request, res: Response) => {
      const vendorId = req.params.vendorId as string;

      const vendor = await service.getVendorById(vendorId);

      res.status(200).json({
        success: true,
        data: vendor,
      });
    }
  );

  /*
   * Get all vendors.
   *
   * Only administrators can access this endpoint.
   *
   * Route:
   * GET /api/marketplace/vendors
   */
  getAllVendors = asyncHandler(
    async (_req: Request, res: Response) => {
      const vendors = await service.getAllVendors();

      res.status(200).json({
        success: true,
        data: vendors,
      });
    }
  );

  /*
   * Get all vendors whose approval status is PENDING.
   *
   * This endpoint is intended for administrators
   * to review pending vendor applications.
   *
   * Route:
   * GET /api/marketplace/vendors/pending
   */
  getPendingVendors = asyncHandler(
    async (_req: Request, res: Response) => {
      const vendors = await service.getPendingVendors();

      res.status(200).json({
        success: true,
        data: vendors,
      });
    }
  );

  /*
   * Update vendor profile information.
   *
   * Only the fields provided in the request body
   * will be updated because this is a PATCH request.
   *
   * Route:
   * PATCH /api/marketplace/vendors/:vendorId
   */
  updateVendor = asyncHandler(
    async (req: Request, res: Response) => {
      const vendorId = req.params.vendorId as string;

      const vendor = await service.updateVendor(
        vendorId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: "Vendor profile updated successfully",
        data: vendor,
      });
    }
  );

  /*
   * Approve a vendor application.
   *
   * Only administrators can approve vendors.
   *
   * Route:
   * PATCH /api/marketplace/vendors/:vendorId/approve
   */
  approveVendor = asyncHandler(
    async (req: Request, res: Response) => {
      const vendorId = req.params.vendorId as string;

      const vendor = await service.approveVendor(vendorId);

      res.status(200).json({
        success: true,
        message: "Vendor approved successfully",
        data: vendor,
      });
    }
  );

  /*
   * Reject a vendor application.
   *
   * Only administrators can reject vendors.
   * A rejection reason is required in the request body.
   *
   * Route:
   * PATCH /api/marketplace/vendors/:vendorId/reject
   */
  rejectVendor = asyncHandler(
    async (req: Request, res: Response) => {
      const vendorId = req.params.vendorId as string;
      const { rejectionReason } = req.body;

      const vendor = await service.rejectVendor(
        vendorId,
        rejectionReason
      );

      res.status(200).json({
        success: true,
        message: "Vendor rejected successfully",
        data: vendor,
      });
    }
  );

  suspendVendor = asyncHandler(async (req: Request, res: Response) => {
    const vendor = await service.suspendVendor(req.params.vendorId as string, req.body.reason);
    res.status(200).json({ success: true, message: "Vendor suspended successfully", data: vendor });
  });
}
