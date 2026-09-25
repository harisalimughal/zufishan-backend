import prisma from "../config/prisma";
import { Role, VendorApprovalStatus } from "@prisma/client";

export class MarketplaceAuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        buyerProfile: true,
        vendorProfile: true,
      },
    });
  }

  async createBuyerUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    address?: string;
    picture?: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: Role.BUYER,
        buyerProfile: {
          create: {
            address: data.address || "",
            picture: data.picture || null,
          },
        },
      },
      include: { buyerProfile: true },
    });
  }

  async createVendorUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    contact: string;
    businessName: string;
    proof: string;
    location: string;
    currentState: string;
    businessRegistrationNumber: string;
    vendorPicture: string;
    businessPicture: string;
    categories?: string[];
  }) {
    const categoryConnect =
      data.categories && data.categories.length > 0
        ? { connect: data.categories.map((id) => ({ id })) }
        : undefined;

    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: Role.VENDOR,
        vendorProfile: {
          create: {
            contact: data.contact || "",
            businessName: data.businessName || "",
            proof: data.proof || "",
            location: data.location || "",
            currentState: data.currentState || "",
            businessRegistrationNumber: data.businessRegistrationNumber || "",
            vendorPicture: data.vendorPicture || "",
            businessPicture: data.businessPicture || "",
            // Set APPROVED directly for local development & automated testing
            approvalStatus: VendorApprovalStatus.PENDING,
          },
        },
      },
      include: {
        vendorProfile: {
          include: { categories: true },
        },
      },
    });
  }
}