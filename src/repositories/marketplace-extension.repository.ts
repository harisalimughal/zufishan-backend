import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { ApiError } from "../utils/apiError";

const rethrowConflict = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(400, "A record already exists for this buyer and item");
  }
  throw error;
};

export class MarketplaceExtensionRepository {
  async createRating(buyerId: string, data: { productId: string; rating: number; comment?: string }) {
    try {
      return await prisma.rating.create({ data: { buyerId, ...data } });
    } catch (error) {
      return rethrowConflict(error);
    }
  }

  async createReturnRequest(buyerId: string, data: { orderItemId: string; reason: string }) {
    try {
      return await prisma.returnRequest.create({ data: { buyerId, ...data } });
    } catch (error) {
      return rethrowConflict(error);
    }
  }
}

export const marketplaceExtensionRepository = new MarketplaceExtensionRepository();
