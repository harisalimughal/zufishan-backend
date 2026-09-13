// src/services/marketplace-admin.service.ts
// Marketplace Admin Service – provides overall marketplace statistics for the admin dashboard.

import prisma from "../config/prisma";

export class MarketplaceAdminService {
  async getStats() {
    const [buyers, vendors, products] = await Promise.all([
      prisma.buyerProfile.count(),
      prisma.vendorProfile.count(),
      prisma.product.count(),
    ]);
    const pendingVendors = await prisma.vendorProfile.count({ where: { approvalStatus: "PENDING" } });
    const approvedVendors = await prisma.vendorProfile.count({ where: { approvalStatus: "APPROVED" } });
    const rejectedVendors = await prisma.vendorProfile.count({ where: { approvalStatus: "REJECTED" } });
    const activeProducts = await prisma.product.count({ where: { isActive: true } });
    const inactiveProducts = await prisma.product.count({ where: { isActive: false } });
    return {
      totalBuyers: buyers,
      totalVendors: vendors,
      vendorsByStatus: { pending: pendingVendors, approved: approvedVendors, rejected: rejectedVendors },
      totalProducts: products,
      productsByActive: { active: activeProducts, inactive: inactiveProducts },
    };
  }
}

export const marketplaceAdminService = new MarketplaceAdminService();
