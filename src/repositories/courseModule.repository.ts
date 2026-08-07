import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const courseModuleRepository = {
  findAllByCourseId: async (courseId: string) => {
    return prisma.courseModule.findMany({
      where: { courseId },
      orderBy: {
        order: "asc",
      },
    });
  },

  findById: async (id: string) => {
    return prisma.courseModule.findUnique({
      where: { id },
    });
  },

  create: async (data: Prisma.CourseModuleCreateInput) => {
    return prisma.courseModule.create({
      data,
    });
  },

  update: async (
    id: string,
    data: Prisma.CourseModuleUpdateInput
  ) => {
    return prisma.courseModule.update({
      where: { id },
      data,
    });
  },

  delete: async (id: string) => {
    return prisma.courseModule.delete({
      where: { id },
    });
  },
};