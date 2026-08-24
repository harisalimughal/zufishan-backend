import { ApiError } from '../utils/apiError'
import type { QiblaQuery } from '../validators/utility.validator'

/**
 * Qibla Service
 *
 * Feature logic to be implemented:
 * - Calculate bearing angle from user's coordinates to Mecca (21.4225° N, 39.8262° E)
 * - Formula: spherical law of cosines / Haversine bearing calculation (no external API needed)
 * - Returns: { direction: number (degrees 0-360), cardinal: string }
 */
export const qiblaService = {
  getQiblaDirection: async (_query: QiblaQuery): Promise<Record<string, unknown>> => {
    // TODO: implement bearing calculation formula
    // const MECCA = { lat: 21.4225, lng: 39.8262 }
    // const bearing = calculateBearing(lat, lng, MECCA.lat, MECCA.lng)
    throw ApiError.internal('Qibla direction feature is not yet implemented')
  },
}
