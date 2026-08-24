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
  calculateZakat: async (
    _body: ZakatCalculateBody,
  ): Promise<Record<string, unknown>> => {
    // TODO: implement Zakat calculation logic
    // 1. Fetch current gold price per gram in the given currency
    // 2. Calculate nisab threshold (85g * goldPricePerGram)
    // 3. Sum all zakatable assets
    // 4. If totalAssets >= nisab → zakatDue = totalAssets * 0.025
    throw ApiError.internal('Zakat calculator feature is not yet implemented')
  },
}
