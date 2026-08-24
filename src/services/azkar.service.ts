import { ApiError } from '../utils/apiError'

export const azkarService = {
  getCategories: async (): Promise<Record<string, unknown>> => {
    // TODO: prisma.azkarCategoryRecord.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } })
    throw ApiError.internal('Azkar categories feature is not yet implemented')
  },

  getItemsByCategory: async (
    _categoryId: string,
    _query: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    // TODO: prisma.azkarItem.findMany({ where: { categoryId, isActive: true }, skip, take })
    throw ApiError.internal('Azkar items by category feature is not yet implemented')
  },

  getItemById: async (_id: string): Promise<Record<string, unknown>> => {
    // TODO: prisma.azkarItem.findUnique({ where: { id } })
    throw ApiError.internal('Azkar item detail feature is not yet implemented')
  },
}
