import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { asyncHandler } from '../utils/asyncHandler'

export const adminController = {
  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.user.count()

    res.status(200).json({
      success: true,
      data: {
        users,
        total,
      },
    })
  }),

  getStats: asyncHandler(async (req: Request, res: Response) => {
    const [totalUsers, totalAdmins, totalStudents] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
    ])

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        totalStudents,
      },
    })
  }),

  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin user',
        })
      }
    }

    await prisma.user.delete({ where: { id } })

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    })
  }),
}