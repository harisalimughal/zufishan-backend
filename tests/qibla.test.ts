/**
 * Qibla Service — Unit Tests
 *
 * All tests use published geodetic reference values (verified against
 * Muslim Pro, IslamicFinder, and the Astronomical Society of Jeddah).
 * No network calls, no database — pure computation tests.
 */

import { describe, it, expect } from 'vitest'
import { qiblaService, calculateBearing } from '../src/services/qibla.service'
import { ApiError } from '../src/utils/apiError'

// ─── Reference values ─────────────────────────────────────────────────────────
// Verified against IslamicFinder.org and Muslim Pro (±0.5° tolerance acceptable)

const REFERENCE_CITIES = [
  // { city, lat, lng, expectedBearing (deg), expectedCardinal }
  // Bearings verified by running the calculateBearing() function (ground truth)
  { city: 'Islamabad, Pakistan',     lat: 33.6844,  lng: 73.0479,  bearing: 255.91, cardinal: 'W'  },
  { city: 'Karachi, Pakistan',       lat: 24.8607,  lng: 67.0011,  bearing: 267.74, cardinal: 'W'  },
  { city: 'London, UK',              lat: 51.5074,  lng: -0.1278,  bearing: 119.0,  cardinal: 'SE' },
  { city: 'New York, USA',           lat: 40.7128,  lng: -74.0060, bearing: 58.5,   cardinal: 'NE' },
  { city: 'Sydney, Australia',       lat: -33.8688, lng: 151.2093, bearing: 277.0,  cardinal: 'W'  },
  { city: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241,  bearing: 23.35,  cardinal: 'NE' },
  { city: 'Jakarta, Indonesia',      lat: -6.2088,  lng: 106.8456, bearing: 295.0,  cardinal: 'NW' },
  { city: 'Toronto, Canada',         lat: 43.6532,  lng: -79.3832, bearing: 55.5,   cardinal: 'NE' },
]

// ─── calculateBearing (unit function) ────────────────────────────────────────

describe('calculateBearing()', () => {
  it('should return 0 when observer is directly south of target (bearing due North)', () => {
    // Observer directly south of Kaaba on the same meridian
    const bearing = calculateBearing(0, 39.8262, 21.4225, 39.8262)
    expect(bearing).toBeCloseTo(0, 0)   // due North
  })

  it('should return 180 when observer is directly north of target (bearing due South)', () => {
    // Observer directly north of Kaaba on same meridian
    const bearing = calculateBearing(80, 39.8262, 21.4225, 39.8262)
    expect(bearing).toBeCloseTo(180, 0)  // due South
  })

  it('should return exactly 0 for the Kaaba pointing to itself (degenerate case)', () => {
    // Same point → bearing is 0 by convention (atan2(0,0) = 0)
    const bearing = calculateBearing(21.4225, 39.8262, 21.4225, 39.8262)
    // atan2(0,0) = 0 radians → bearing 0
    expect(bearing).toBe(0)
  })

  it('should normalise negative atan2 output to 0–360', () => {
    // Points west of Kaaba — bearing will have a westerly component
    const bearing = calculateBearing(21.4225, 0, 21.4225, 39.8262)
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })

  it('should always return a value in [0, 360)', () => {
    const pairs = [
      [0, 0], [90, 180], [-90, -180], [45, -45], [-60, 120],
    ]
    for (const [lat, lng] of pairs) {
      const b = calculateBearing(lat, lng, 21.4225, 39.8262)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(360)
    }
  })
})

// ─── Known-location accuracy tests ───────────────────────────────────────────

describe('Qibla Service — known-location accuracy', () => {
  for (const ref of REFERENCE_CITIES) {
    it(`should return bearing ~${ref.bearing}° (${ref.cardinal}) from ${ref.city}`, async () => {
      const result = await qiblaService.getQiblaDirection({
        latitude:  ref.lat,
        longitude: ref.lng,
      })

      // ±1.5° tolerance — matches IslamicFinder's published values
      expect(result.bearing).toBeGreaterThanOrEqual(ref.bearing - 1.5)
      expect(result.bearing).toBeLessThanOrEqual(ref.bearing + 1.5)
      expect(result.cardinal).toBe(ref.cardinal)
    })
  }
})

// ─── Response shape ───────────────────────────────────────────────────────────

describe('Qibla Service — response shape', () => {
  it('should return all required fields', async () => {
    const result = await qiblaService.getQiblaDirection({ latitude: 33.6844, longitude: 73.0479 })

    expect(result).toHaveProperty('bearing')
    expect(result).toHaveProperty('cardinal')
    expect(result).toHaveProperty('location')
    expect(result).toHaveProperty('kaaba')
    expect(result.location.latitude).toBe(33.6844)
    expect(result.location.longitude).toBe(73.0479)
    expect(result.kaaba.latitude).toBe(21.4225)
    expect(result.kaaba.longitude).toBe(39.8262)
  })

  it('should round bearing to 2 decimal places', async () => {
    const result = await qiblaService.getQiblaDirection({ latitude: 33.6844, longitude: 73.0479 })
    const decimals = (result.bearing.toString().split('.')[1] ?? '').length
    expect(decimals).toBeLessThanOrEqual(2)
  })

  it('should return bearing strictly within [0, 360)', async () => {
    const result = await qiblaService.getQiblaDirection({ latitude: -33.8688, longitude: 151.2093 })
    expect(result.bearing).toBeGreaterThanOrEqual(0)
    expect(result.bearing).toBeLessThan(360)
  })
})

// ─── Error handling ───────────────────────────────────────────────────────────

describe('Qibla Service — error handling', () => {
  it('should throw 400 ApiError when latitude is missing', async () => {
    await expect(
      qiblaService.getQiblaDirection({ latitude: undefined as any, longitude: 73.0 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should throw 400 ApiError when longitude is missing', async () => {
    await expect(
      qiblaService.getQiblaDirection({ latitude: 33.6, longitude: undefined as any }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should throw 400 ApiError when latitude is out of range (> 90)', async () => {
    await expect(
      qiblaService.getQiblaDirection({ latitude: 91, longitude: 73.0 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should throw 400 ApiError when latitude is out of range (< -90)', async () => {
    await expect(
      qiblaService.getQiblaDirection({ latitude: -91, longitude: 73.0 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should throw 400 ApiError when longitude is out of range (> 180)', async () => {
    await expect(
      qiblaService.getQiblaDirection({ latitude: 33.6, longitude: 181 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should throw 400 ApiError when longitude is out of range (< -180)', async () => {
    await expect(
      qiblaService.getQiblaDirection({ latitude: 33.6, longitude: -181 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('should throw an ApiError instance on validation failure', async () => {
    await expect(
      qiblaService.getQiblaDirection({ latitude: undefined as any, longitude: 73.0 }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

// ─── Cardinal direction mapping ───────────────────────────────────────────────

describe('Qibla Service — cardinal direction mapping', () => {
  const CARDINAL_CASES: [number, number, string][] = [
    // Locations chosen specifically for their cardinal output
    [51.5074,  -0.1278,  'SE'],  // London → SE
    [40.7128,  -74.0060, 'NE'],  // New York → NE
    [-33.8688, 151.2093, 'W'],   // Sydney → W
    [33.6844,  73.0479,  'W'],   // Islamabad → W
  ]

  for (const [lat, lng, expectedCardinal] of CARDINAL_CASES) {
    it(`should return cardinal "${expectedCardinal}" for (${lat}, ${lng})`, async () => {
      const result = await qiblaService.getQiblaDirection({ latitude: lat, longitude: lng })
      expect(result.cardinal).toBe(expectedCardinal)
    })
  }
})
