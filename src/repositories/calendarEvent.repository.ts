import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const calendarEventRepository = {
  findAll: async () => {
    return prisma.calendarEvent.findMany({
      include: {
        user: true,
        course: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });
  },

  findById: async (id: string) => {
    return prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        user: true,
        course: true,
      },
    });
  },

  findByUserId: async (userId: string) => {
    return prisma.calendarEvent.findMany({
      where: { userId },
      include: {
        course: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });
  },

  create: async (
    userId: string,
    data: Omit<Prisma.CalendarEventCreateInput, "user">
  ) => {
    return prisma.calendarEvent.create({
      data: {
        ...data,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  },

  update: async (
    id: string,
    data: Prisma.CalendarEventUpdateInput
  ) => {
    return prisma.calendarEvent.update({
      where: { id },
      data,
    });
  },

  delete: async (id: string) => {
    return prisma.calendarEvent.delete({
      where: { id },
    });
  },
};