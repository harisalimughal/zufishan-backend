/**
 * Hijri Date Service & Converter — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hijriDateService, parseDateInput } from '../src/services/hijriDate.service'
import { hijriConverter, resolveRegionalAdjustment, calculateLocalTabularHijri } from '../src/services/hijriConverter'
import { islamicEventsEngine } from '../src/services/islamicEvents'
import { ApiError } from '../src/utils/apiError'

describe('parseDateInput()', () => {
  it('should parse YYYY-MM-DD format into UTC Date', () => {
    const date = parseDateInput('2026-09-02')
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(8) // September is 0-indexed month 8
    expect(date.getUTCDate()).toBe(2)
  })

  it('should parse DD-MM-YYYY format into UTC Date', () => {
    const date = parseDateInput('02-09-2026')
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(8)
    expect(date.getUTCDate()).toBe(2)
  })

  it('should default to today UTC date when omitted', () => {
    const date = parseDateInput(undefined)
    const now = new Date()
    expect(date.getUTCFullYear()).toBe(now.getUTCFullYear())
    expect(date.getUTCMonth()).toBe(now.getUTCMonth())
  })

  it('should throw 400 ApiError for invalid date string', () => {
    expect(() => parseDateInput('invalid-date')).toThrow(ApiError)
  })

  it('should throw 400 ApiError for invalid month > 12', () => {
    expect(() => parseDateInput('2026-15-02')).toThrow(ApiError)
  })

  it('should throw 400 ApiError for invalid day > 31', () => {
    expect(() => parseDateInput('2026-09-35')).toThrow(ApiError)
  })
})

describe('resolveRegionalAdjustment()', () => {
  it('should prioritize explicit adjustment if provided', () => {
    const adj = resolveRegionalAdjustment({ latitude: 33.6844, longitude: 73.0479, adjustment: 1 })
    expect(adj).toBe(1)
  })

  it('should return -1 for South Asian coordinates (e.g. Islamabad)', () => {
    const adj = resolveRegionalAdjustment({ latitude: 33.6844, longitude: 73.0479 })
    expect(adj).toBe(-1)
  })

  it('should return -1 for Karachi coordinates', () => {
    const adj = resolveRegionalAdjustment({ latitude: 24.8607, longitude: 67.0011 })
    expect(adj).toBe(-1)
  })

  it('should return 0 for Middle East / Makkah coordinates', () => {
    const adj = resolveRegionalAdjustment({ latitude: 21.4225, longitude: 39.8262 })
    expect(adj).toBe(0)
  })

  it('should return 0 when coordinates are omitted', () => {
    const adj = resolveRegionalAdjustment()
    expect(adj).toBe(0)
  })
})

describe('calculateLocalTabularHijri() fallback algorithm', () => {
  it('should convert a known Gregorian date to valid Hijri structure', () => {
    const date = new Date(Date.UTC(2026, 8, 2)) // 2 Sep 2026
    const res = calculateLocalTabularHijri(date, 0)

    expect(res.year).toBeGreaterThanOrEqual(1447)
    expect(res.year).toBeLessThanOrEqual(1449)
    expect(res.month.number).toBeGreaterThanOrEqual(1)
    expect(res.month.number).toBeLessThanOrEqual(12)
    expect(res.day).toBeGreaterThanOrEqual(1)
    expect(res.day).toBeLessThanOrEqual(30)
    expect(res.provider).toBe('local_tabular')
  })

  it('should shift day by +1 when adjustment is +1', () => {
    const date = new Date(Date.UTC(2026, 8, 2))
    const base = calculateLocalTabularHijri(date, 0)
    const plus1 = calculateLocalTabularHijri(date, 1)

    if (base.day < 30) {
      expect(plus1.day).toBe(base.day + 1)
    } else {
      expect(plus1.day).toBe(1)
    }
  })
})

describe('islamicEventsEngine', () => {
  it('should return 1st Day of Ramadan for 1 Ramadan', () => {
    const evt = islamicEventsEngine.getCurrentEvent(1, 9)
    expect(evt).not.toBeNull()
    expect(evt?.name).toContain('Ramadan')
    expect(evt?.category).toBe('Fasting')
  })

  it('should return Eid al-Fitr for 1 Shawwal', () => {
    const evt = islamicEventsEngine.getCurrentEvent(1, 10)
    expect(evt).not.toBeNull()
    expect(evt?.name).toContain('Eid al-Fitr')
    expect(evt?.category).toBe('Holiday')
  })

  it('should return null for a non-event day', () => {
    const evt = islamicEventsEngine.getCurrentEvent(5, 2) // 5 Safar
    expect(evt).toBeNull()
  })

  it('should return nearby events sorted by daysRemaining', () => {
    const nearby = islamicEventsEngine.getNearbyEvents(20, 2, 1448, 4) // 20 Safar
    expect(nearby.length).toBe(4)
    expect(nearby[0].daysRemaining).toBeLessThanOrEqual(nearby[1].daysRemaining)
    expect(nearby[1].daysRemaining).toBeLessThanOrEqual(nearby[2].daysRemaining)
  })
})

describe('hijriDateService.convertToHijri()', () => {
  it('should return full expected API response payload', async () => {
    const res = await hijriDateService.convertToHijri({
      date: '2026-09-02',
      latitude: 33.6844,
      longitude: 73.0479,
    })

    expect(res).toHaveProperty('gregorian')
    expect(res).toHaveProperty('hijri')
    expect(res).toHaveProperty('location')
    expect(res).toHaveProperty('currentEvent')
    expect(res).toHaveProperty('nearbyEvents')

    expect(res.gregorian.date).toBe('2026-09-02')
    expect(res.gregorian.weekday).toBe('Wednesday')
    expect(res.gregorian.year).toBe(2026)

    expect(res.location?.adjustment).toBe(-1)
    expect(res.location?.regionNote).toContain('South Asia')

    expect(Array.isArray(res.nearbyEvents)).toBe(true)
    expect(res.nearbyEvents.length).toBeGreaterThan(0)
  })

  it('should handle explicit day adjustment query param', async () => {
    const res = await hijriDateService.convertToHijri({
      date: '2026-09-02',
      adjustment: 2,
    })

    expect(res.location?.adjustment).toBe(2)
    expect(res.location?.regionNote).toContain('Explicit day adjustment')
  })
})
