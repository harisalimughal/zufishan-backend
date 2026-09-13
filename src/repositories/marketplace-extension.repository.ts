import prisma from "../config/prisma";

export const marketplaceExtensionRepository = {
  listCategories: () => prisma.productCategory.findMany({
    orderBy: { name: "asc" },
    include: { parent: true, children: true },
  }),

  createCategory: (data: any) => prisma.productCategory.create({ data }),

  findCategory: (id: string) => prisma.productCategory.findUnique({ where: { id } }),

  findCategoryBySlug: (slug: string, excludeId?: string) => prisma.productCategory.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
  }),

  updateCategory: (id: string, data: any) => prisma.productCategory.update({ where: { id }, data }),

  listRatings: (productId: string) => prisma.rating.findMany({
    where: { productId },
    include: { buyer: { include: { user: { select: { fullName: true } } } } },
    orderBy: { createdAt: "desc" },
  }),

  findRating: (id: string) => prisma.rating.findUnique({ where: { id } }),

  findBuyerRating: (buyerId: string, productId: string) => prisma.rating.findFirst({
    where: { buyerId, productId },
  }),

  findDeliveredPurchase: (buyerId: string, productId: string) => prisma.orderItem.findFirst({
    where: { productId, order: { buyerId, status: "DELIVERED" } },
  }),

  createRating: (data: any) => prisma.rating.create({ data }),
  updateRating: (id: string, data: any) => prisma.rating.update({ where: { id }, data }),
  deleteRating: (id: string) => prisma.rating.delete({ where: { id } }),
};
