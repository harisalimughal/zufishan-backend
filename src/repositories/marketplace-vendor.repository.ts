// repositories/marketplace-vendor.repository.ts

import { prisma } from "../config/prisma";
import { VendorApprovalStatus } from "@prisma/client";

export class MarketplaceVendorRepository {
  async findVendorById(vendorId: string) {
    return await prisma.vendorProfile.findUnique({
      where: {
        id: vendorId,
      },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, bio: true, createdAt: true, updatedAt: true } },
        categories: true,
      },
    });
  }

  async findAllVendors() {
    return await prisma.vendorProfile.findMany({
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, bio: true, createdAt: true, updatedAt: true } },
        categories: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findPendingVendors() {
    return await prisma.vendorProfile.findMany({
      where: {
        approvalStatus: VendorApprovalStatus.PENDING,
      },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, bio: true, createdAt: true, updatedAt: true } },
        categories: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

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
    return await prisma.vendorProfile.update({
      where: {
        id: vendorId,
      },
      data,
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, bio: true, createdAt: true, updatedAt: true } },
        categories: true,
      },
    });
  }

  async approveVendor(vendorId: string) {
    return await prisma.vendorProfile.update({
      where: {
        id: vendorId,
      },
      data: {
        approvalStatus: VendorApprovalStatus.APPROVED,
        rejectionReason: null,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, bio: true, createdAt: true, updatedAt: true } },
        categories: true,
      },
    });
  }

  async rejectVendor(vendorId: string, rejectionReason: string) {
    return await prisma.vendorProfile.update({
      where: {
        id: vendorId,
      },
      data: {
        approvalStatus: VendorApprovalStatus.REJECTED,
        rejectionReason,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, bio: true, createdAt: true, updatedAt: true } },
        categories: true,
      },
    });
  }

  async suspendVendor(vendorId: string, reason: string) {
    return prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { approvalStatus: VendorApprovalStatus.SUSPENDED, rejectionReason: reason, reviewedAt: new Date() },
      include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true, role: true, bio: true, createdAt: true, updatedAt: true } }, categories: true },
    });
  }
}
