import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const messageRepository = {
  findAll: async () => {
    return prisma.message.findMany({
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },

  findById: async (id: string) => {
    return prisma.message.findUnique({
      where: { id },
      include: {
        sender: true,
        receiver: true,
      },
    });
  },

  findConversation: async (
    userId: string,
    otherUserId: string
  ) => {
    return prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: otherUserId,
          },
          {
            senderId: otherUserId,
            receiverId: userId,
          },
        ],
      },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },

  findByReceiver: async (receiverId: string) => {
    return prisma.message.findMany({
      where: {
        receiverId,
      },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  findUnreadByReceiver: async (receiverId: string) => {
    return prisma.message.findMany({
      where: {
        receiverId,
        isRead: false,
      },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  create: async (
    senderId: string,
    receiverId: string,
    data: Omit<
      Prisma.MessageCreateInput,
      "sender" | "receiver"
    >
  ) => {
    return prisma.message.create({
      data: {
        ...data,
        sender: {
          connect: {
            id: senderId,
          },
        },
        receiver: {
          connect: {
            id: receiverId,
          },
        },
      },
      include: {
        sender: true,
        receiver: true,
      },
    });
  },

  markAsRead: async (id: string) => {
    return prisma.message.update({
      where: { id },
      data: {
        isRead: true,
      },
    });
  },

  markConversationAsRead: async (
    receiverId: string,
    senderId: string
  ) => {
    return prisma.message.updateMany({
      where: {
        receiverId,
        senderId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  },

  update: async (
    id: string,
    data: Prisma.MessageUpdateInput
  ) => {
    return prisma.message.update({
      where: { id },
      data,
    });
  },

  delete: async (id: string) => {
    return prisma.message.delete({
      where: { id },
    });
  },
};