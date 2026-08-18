import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const assignmentRepository = {
  findAll: async () => {
    return prisma.assignment.findMany({
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });
  },

  findById: async (id: string) => {
    return prisma.assignment.findUnique({
      where: { id },
      include: {
        course: true,
        submissions: true,
      },
    });
  },

  create: async (data: {
    courseId: string;
    title: string;
    description: string;
    dueDate: Date;
    totalPoints?: number;
  }) => {
    return prisma.assignment.create({
      data,
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  },

  createSubmission: async (data: {
    assignmentId: string;
    userId: string;
    content?: string;
    fileUrl?: string;
  }) => {
    return prisma.submission.upsert({
      where: {
        assignmentId_userId: {
          assignmentId: data.assignmentId,
          userId: data.userId,
        },
      },
      update: {
        content: data.content,
        fileUrl: data.fileUrl,
        submittedAt: new Date(),
      },
      create: {
        assignmentId: data.assignmentId,
        userId: data.userId,
        content: data.content,
        fileUrl: data.fileUrl,
      },
    });
  },

  findSubmission: async (assignmentId: string, userId: string) => {
    return prisma.submission.findUnique({
      where: {
        assignmentId_userId: {
          assignmentId,
          userId,
        },
      },
    });
  },
};
