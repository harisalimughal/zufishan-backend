import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const submissionRepository = {
  findAll: async () => {
    return prisma.submission.findMany({
      include: {
        assignment: true,
        user: true,
      },
    });
  },

  findById: async (id: string) => {
    return prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: true,
        user: true,
      },
    });
  },

  findByAssignmentAndUser: async (
    assignmentId: string,
    userId: string
  ) => {
    return prisma.submission.findUnique({
      where: {
        assignmentId_userId: {
          assignmentId,
          userId,
        },
      },
    });
  },

  findByAssignmentId: async (assignmentId: string) => {
    return prisma.submission.findMany({
      where: {
        assignmentId,
      },
      include: {
        assignment: true,
        user: true,
      },
    });
  },

  create: async (
  assignmentId: string,
  userId: string,
  data: Omit<
    Prisma.SubmissionCreateInput,
    "assignment" | "user"
  >
) => {
  return prisma.submission.create({
    data: {
      ...data,

      assignment: {
        connect: {
          id: assignmentId,
        },
      },

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
    data: Prisma.SubmissionUpdateInput
  ) => {
    return prisma.submission.update({
      where: { id },
      data,
    });
  },

  delete: async (id: string) => {
    return prisma.submission.delete({
      where: { id },
    });
  },
};