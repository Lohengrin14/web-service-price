import { describe, expect, it } from 'vitest'
import {
  canonicalNumber,
  formatPrice,
  formatShipment,
  normalizeNumber,
  pluralize,
  shipmentTime,
} from './format'

describe('formatShipment', () => {
  it('понимает ISO и формат 1С', () => {
    expect(formatShipment('2026-10-29T14:00:00')).toBe('29.10, заказ до 14:00')
    expect(formatShipment('29.10.2026 9:30:00')).toBe('29.10, заказ до 09:30')
  })

  it('не показывает время 00:00 и не ломается на незнакомом формате', () => {
    expect(formatShipment('2026-10-29T00:00:00')).toBe('29.10')
    expect(formatShipment('завтра')).toBe('завтра')
    expect(formatShipment('')).toBe('')
  })
})

describe('shipmentTime', () => {
  it('одинаково понимает ISO и формат 1С и не ломается на мусоре', () => {
    expect(shipmentTime('2026-10-29T14:00:00')).toBe(shipmentTime('29.10.2026 14:00:00'))
    expect(shipmentTime('2026-10-29')).toBeLessThan(shipmentTime('2026-10-29T09:00:00'))
    expect(shipmentTime('завтра')).toBeNull()
    expect(shipmentTime('')).toBeNull()
  })
})

describe('formatPrice', () => {
  it('форматирует рубли и пустую цену', () => {
    expect(formatPrice(1234.5).replace(/\s/g, ' ')).toBe('1 234,50 ₽')
    expect(formatPrice(null)).toBe('—')
  })
})

describe('pluralize', () => {
  it('склоняет по-русски', () => {
    const forms = ['деталь', 'детали', 'деталей']
    expect([1, 2, 5, 11, 21, 104].map((n) => pluralize(n, forms))).toEqual([
      'деталь',
      'детали',
      'деталей',
      'деталей',
      'деталь',
      'детали',
    ])
  })
})

describe('normalizeNumber', () => {
  it('убирает лишние пробелы и переводит в верхний регистр', () => {
    expect(normalizeNumber('  oc   90 ')).toBe('OC 90')
    expect(normalizeNumber('01089')).toBe('01089')
    expect(normalizeNumber(null)).toBe('')
  })
})

describe('canonicalNumber', () => {
  it('сводит разные написания артикула к одному ключу', () => {
    expect(new Set(['OC 90', 'OC-90', 'OC90', ' oc.90 '].map(canonicalNumber))).toEqual(new Set(['OC90']))
    expect(canonicalNumber('ваз-2108')).toBe('ВАЗ2108')
  })
})
