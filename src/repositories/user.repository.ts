// user.repository.ts — the ONLY place that talks to Prisma for the "user"
// module. Every method wraps a single Prisma call (findMany, findUnique,
// create, update, delete). No business logic — if you're writing an `if`
// that isn't a query condition, it belongs in the service layer instead.
//
// TODO:
// - import { prisma } from "../config/prisma";
// - export const findMany = () => prisma.user.findMany();
// - export const findById = (id: string) => prisma.user.findUnique({ where: { id } });
// - export const create = (data: ...) => prisma.user.create({ data });
// - export const update = (id: string, data: ...) => prisma.user.update({ where: { id }, data });
// - export const remove = (id: string) => prisma.user.delete({ where: { id } });
import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'

export const userRepository = {
  findById: (id: string, select?: Prisma.UserSelect) => {
    return prisma.user.findUnique({
      where: { id },
      select,
    })
  },

  update: (id: string, data: Prisma.UserUpdateInput) => {
    return prisma.user.update({
      where: { id },
      data,
    })
  },

  upsertPreferences: (userId: string, data: { theme?: string; language?: string; notificationsEnabled?: boolean }) => {
    return prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
  },

  getProfileWithStats: (id: string) => {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        preferences: true,
        streak: {
          select: {
            currentStreak: true,
            bestStreak: true,
            lastActiveDate: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            achievements: true,
          },
        },
      },
    })
  },
}

export type UserRepository = typeof userRepository