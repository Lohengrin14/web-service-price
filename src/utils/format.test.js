import { describe, expect, it } from 'vitest'
import {
  canonicalNumber,
  detectMode,
  formatPrice,
  formatPriceRound,
  formatShipment,
  normalizeNumber,
  shipmentParts,
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

describe('shipmentParts', () => {
  it('отдаёт дату и московское время «заказ до» отдельно, без сдвига пояса', () => {
    expect(shipmentParts('2026-10-31T13:30:00+03:00')).toEqual({ date: '31.10', time: '13:30' })
    expect(shipmentParts('2026-10-31T13:30:00+03:00', 'en')).toEqual({ date: 'Oct 31', time: '13:30' })
    expect(shipmentParts('2026-10-29T00:00:00')).toEqual({ date: '29.10', time: '' })
    expect(shipmentParts('завтра')).toBeNull()
  })
})

describe('formatShipment по-английски', () => {
  it('переводит слова, но не сдвигает московское время на часовой пояс браузера', () => {
    expect(formatShipment('2026-10-31T13:30:00+03:00', 'en')).toBe('Oct 31, order by 13:30')
    expect(formatShipment('2026-10-31T13:30:00+03:00', 'ru')).toBe('31.10, заказ до 13:30')
  })
})

describe('formatPriceRound', () => {
  it('показывает цену без копеек', () => {
    expect(formatPriceRound(2500).replace(/\s/g, ' ')).toBe('2 500 ₽')
    expect(formatPriceRound(2500, 'en')).toBe('₽2,500')
  })
})

describe('formatPrice', () => {
  it('в английской версии показывает ₽, а не RUB', () => {
    expect(formatPrice(1234.5, 'en')).toBe('₽1,234.50')
  })

  it('форматирует рубли и пустую цену', () => {
    expect(formatPrice(1234.5).replace(/\s/g, ' ')).toBe('1 234,50 ₽')
    expect(formatPrice(null)).toBe('—')
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

describe('detectMode', () => {
  it('с цифрами — артикул, без цифр — название', () => {
    expect(detectMode('ОС90')).toBe('article') // кириллица, но API понимает
    expect(detectMode('PB1-002')).toBe('article')
    expect(detectMode('колодки')).toBe('name')
    expect(detectMode('brake pads')).toBe('name')
    expect(detectMode('колодки 2109')).toBe('article') // край: название с цифрами не поддерживаем
  })
})
