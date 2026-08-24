import { ApiError } from '../utils/apiError'
import type { ZakatCalculateBody } from '../validators/utility.validator'

/**
 * Zakat Service
 *
 * Feature logic to be implemented:
 * - Calculate Zakat based on the user's assets
 * - Nisab threshold: ~85g gold or ~595g silver (market price dependent)
 * - Zakat rate: 2.5% of total zakatable assets above nisab
 * - Optional: fetch live gold/silver prices for accurate nisab calculation
 *   (e.g. metals-api.com or goldapi.io)
 *
 * Formula:
 *   totalAssets = goldValue + silverValue + cashSavings + investments + businessAssets + receivables
 *   if (totalAssets >= nisabThreshold) zakatDue = totalAssets * 0.025
 */
export const zakatService = {
  getNisabRate: async (): Promise<Record<string, unknown>> => {
    // TODO: fetch latest ZakatNisabRate from DB, or call gold price API
    throw ApiError.internal('Nisab rate feature is not yet implemented')
  },

  calculateZakat: async (
    _body: ZakatCalculateBody,
  ): Promise<Record<string, unknown>> => {
    throw ApiError.internal('Zakat calculator feature is not yet implemented')
  },

  getHistory: async (
    _userId: string,
    _query: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    // TODO: prisma.zakatCalculation.findMany({ where: { userId }, skip, take })
    throw ApiError.internal('Zakat history feature is not yet implemented')
  },
}

