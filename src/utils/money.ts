/**
 * Precise financial arithmetic helpers.
 *
 * Built on Prisma's Decimal (decimal.js) so money math never goes through
 * IEEE-754 floats. All public outputs are fixed-scale decimal strings /
 * numbers derived from Decimal — never from native `+` / `*` on JS numbers.
 */

import { Decimal } from '@prisma/client/runtime/library'

/** Scale used for monetary Zakat amounts (matches DB Decimal(18,4)). */
export const MONEY_SCALE = 4

/** Scale used for rate fractions (e.g. 0.0250 = 2.5%). */
export const RATE_SCALE = 6

export type MoneyInput = Decimal | string | number

export function toMoney(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid money value: ${value}`)
    }
    // Stringify via toFixed to avoid binary float artefacts entering Decimal
    return new Decimal(value.toFixed(MONEY_SCALE + 2))
  }
  return new Decimal(value)
}

export function moneyAdd(...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((sum, v) => sum.add(toMoney(v)), new Decimal(0))
}

export function moneyMul(a: MoneyInput, b: MoneyInput): Decimal {
  return toMoney(a).mul(toMoney(b))
}

export function moneyDiv(a: MoneyInput, b: MoneyInput): Decimal {
  const divisor = toMoney(b)
  if (divisor.isZero()) {
    throw new Error('Division by zero in moneyDiv')
  }
  return toMoney(a).div(divisor)
}

export function moneyCmp(a: MoneyInput, b: MoneyInput): number {
  return toMoney(a).comparedTo(toMoney(b))
}

export function moneyGte(a: MoneyInput, b: MoneyInput): boolean {
  return moneyCmp(a, b) >= 0
}

export function moneyIsZero(a: MoneyInput): boolean {
  return toMoney(a).isZero()
}

/** Round half-up to MONEY_SCALE and return a plain number safe for JSON. */
export function moneyToNumber(value: MoneyInput, scale = MONEY_SCALE): number {
  return Number(toMoney(value).toFixed(scale))
}

/** Round half-up to RATE_SCALE. */
export function rateToNumber(value: MoneyInput, scale = RATE_SCALE): number {
  return Number(toMoney(value).toFixed(scale))
}

export function moneyToString(value: MoneyInput, scale = MONEY_SCALE): string {
  return toMoney(value).toFixed(scale)
}

/**
 * Percentage of a principal using Decimal math.
 * e.g. moneyPercent(1000, '0.025') → 25.0000
 */
export function moneyPercent(principal: MoneyInput, rate: MoneyInput): Decimal {
  return moneyMul(principal, rate)
}
