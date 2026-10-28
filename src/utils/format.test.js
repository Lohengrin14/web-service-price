import { describe, expect, it } from 'vitest'
import { formatPrice, formatShipment, pluralize } from './format'

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
