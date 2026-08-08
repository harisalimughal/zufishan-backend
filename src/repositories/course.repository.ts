import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const courseRepository = {
  findAll: async () => {
    return prisma.course.findMany();
  },

  findById: async (id: string) => {
    return prisma.course.findUnique({
      where: {
        id,
      },
    });
  },

  findBySlug: async (detailSlug: string) => {
    return prisma.course.findUnique({
      where: {
        detailSlug,
      },
    });
  },

  create: async (data: Prisma.CourseCreateInput) => {
    return prisma.course.create({
      data,
    });
  },

  update: async (id: string, data: Prisma.CourseUpdateInput) => {
    return prisma.course.update({
      where: {
        id,
      },
      data,
    });
  },

  delete: async (id: string) => {
    return prisma.course.delete({
      where: {
        id,
      },
    });
  },
};
