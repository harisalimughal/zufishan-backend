import { MarketplaceVendorRepository } from "../repositories/marketplace-vendor.repository";
import { ApiError } from "../utils/apiError";

export class MarketplaceVendorService {
  // Repository handles all database-related operations.
  private repository: MarketplaceVendorRepository;

  constructor() {
    this.repository = new MarketplaceVendorRepository();
  }

  // Get a single vendor using the vendor profile ID.
  async getVendorById(vendorId: string) {
    const vendor = await this.repository.findVendorById(vendorId);

    // If the vendor does not exist, return a 404 error.
    if (!vendor) {
      throw new ApiError(404, "Vendor not found");
    }

    return vendor;
  }

  // Get all vendors from the database.
  async getAllVendors() {
    return await this.repository.findAllVendors();
  }

  // Get only vendors whose approval status is PENDING.
  // This will mainly be used by administrators for vendor review.
  async getPendingVendors() {
    return await this.repository.findPendingVendors();
  }

  // Update a vendor's profile information.
  async updateVendor(
    vendorId: string,
    data: {
      contact?: string;
      businessName?: string;
      proof?: string;
      location?: string;
      currentState?: string;
      businessRegistrationNumber?: string;
      vendorPicture?: string;
      businessPicture?: string;
    }
  ) {
    // First check whether the vendor exists.
    const vendor = await this.repository.findVendorById(vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found");
    }

    // Once a vendor has been approved, its profile cannot be changed
    // through this update operation.
    if (vendor.approvalStatus === "APPROVED") {
      throw new ApiError(
        400,
        "Approved vendor profile cannot be updated"
      );
    }

    // Pass the validated data to the repository for database update.
    return await this.repository.updateVendor(vendorId, data);
  }

  // Approve a vendor after reviewing their submitted information.
  async approveVendor(vendorId: string) {
    // Check whether the vendor exists before approving.
    const vendor = await this.repository.findVendorById(vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found");
    }

    // Prevent approving a vendor that is already approved.
    if (vendor.approvalStatus === "APPROVED") {
      throw new ApiError(400, "Vendor is already approved");
    }

    // Update the vendor's approval status through the repository.
    return await this.repository.approveVendor(vendorId);
  }

  // Reject a vendor and store the reason for rejection.
  async rejectVendor(
    vendorId: string,
    rejectionReason: string
  ) {
    // Check whether the vendor exists before rejecting.
    const vendor = await this.repository.findVendorById(vendorId);

    if (!vendor) {
      throw new ApiError(404, "Vendor not found");
    }

    // Prevent rejecting a vendor that is already rejected.
    if (vendor.approvalStatus === "REJECTED") {
      throw new ApiError(400, "Vendor is already rejected");
    }

    // Update the vendor's status and save the rejection reason.
    return await this.repository.rejectVendor(
      vendorId,
      rejectionReason
    );
  }

  async suspendVendor(vendorId: string, reason: string) {
    const vendor = await this.repository.findVendorById(vendorId);
    if (!vendor) throw new ApiError(404, "Vendor not found");
    if (vendor.approvalStatus === "SUSPENDED") throw new ApiError(400, "Vendor is already suspended");
    return this.repository.suspendVendor(vendorId, reason);
  }
}
