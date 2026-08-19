import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const groupMessageRepository = {
  findAll: async () => {
    return prisma.groupMessage.findMany({
      include: {
        sender: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },

  findById: async (id: string) => {
    return prisma.groupMessage.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
        },
      },
    });
  },

  findByChannelId: async (channelId: string) => {
    return prisma.groupMessage.findMany({
      where: { channelId },
      include: {
        sender: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },

  create: async (
    channelId: string,
    senderId: string,
    data: Omit<Prisma.GroupMessageCreateInput, "sender">
  ) => {
    return prisma.groupMessage.create({
      data: {
        ...data,
        channelId,
        sender: {
          connect: {
            id: senderId,
          },
        },
      },
      include: {
        sender: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
        },
      },
    });
  },

  update: async (
    id: string,
    data: Prisma.GroupMessageUpdateInput
  ) => {
    return prisma.groupMessage.update({
      where: { id },
      data,
      include: {
        sender: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
        },
      },
    });
  },

  delete: async (id: string) => {
    return prisma.groupMessage.delete({
      where: { id },
    });
  },
};