import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const courseResourceRepository = {
  findAllByCourseId: async (courseId: string) => {
    return prisma.courseResource.findMany({
      where: { courseId },
      orderBy: {
        uploadedAt: "desc",
      },
    });
  },

  findById: async (id: string) => {
    return prisma.courseResource.findUnique({
      where: { id },
    });
  },

  create: async (data: Prisma.CourseResourceCreateInput) => {
    return prisma.courseResource.create({
      data,
    });
  },

  update: async (
    id: string,
    data: Prisma.CourseResourceUpdateInput
  ) => {
    return prisma.courseResource.update({
      where: { id },
      data,
    });
  },

  delete: async (id: string) => {
    return prisma.courseResource.delete({
      where: { id },
    });
  },
};