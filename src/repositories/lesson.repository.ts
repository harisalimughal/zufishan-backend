import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const lessonRepository = {
  findAllByModuleId: async (moduleId: string) => {
    return prisma.lesson.findMany({
      where: {
        moduleId,
      },
      orderBy: {
        order: "asc",
      },
    });
  },

  findById: async (id: string) => {
    return prisma.lesson.findUnique({
      where: {
        id,
      },
    });
  },

  create: async (data: Prisma.LessonCreateInput) => {
    return prisma.lesson.create({
      data,
    });
  },

  update: async (
    id: string,
    data: Prisma.LessonUpdateInput
  ) => {
    return prisma.lesson.update({
      where: {
        id,
      },
      data,
    });
  },

  delete: async (id: string) => {
    return prisma.lesson.delete({
      where: {
        id,
      },
    });
  },
};