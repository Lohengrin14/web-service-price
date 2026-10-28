import { describe, expect, it } from 'vitest'
import filtersReducer, {
  applyFilters,
  priceScale,
  selectHasActiveFilters,
  selectOfferBrands,
  selectOfferCities,
  selectVisibleOffers,
  setInStockOnly,
  setMinPrice,
  toggleBrand,
} from './filtersSlice'
import { fetchOffers } from './searchSlice'

const offer = (id, brand, price, stock, city, shipmentDate = '', isOriginal = false, flags = {}) => ({
  id,
  brand,
  price,
  stock,
  city,
  shipmentDate,
  isOriginal,
  own: false,
  notRefund: false,
  ...flags,
})

// Порядок как после extractOffers: искомая деталь, затем в наличии по цене, затем без остатка
const items = [
  offer('meyle', 'MEYLE', 850, 20, 'МСК', '2026-10-30T14:00:00', true),
  offer('mann-spb', 'MANN', 700, 3, 'СПБ', '2026-10-29T10:00:00'),
  offer('mann-ms1', 'MANN', 990, 4, 'МСК', '2026-10-31T10:00:00'),
  offer('febi', 'FEBI', null, 0, ''),
]

const noFilters = filtersReducer(undefined, { type: 'init' })
const ids = (list) => list.map((item) => item.id)

describe('applyFilters', () => {
  it('без фильтров сохраняет порядок по умолчанию и не меняет исходный массив', () => {
    const result = applyFilters(items, noFilters)
    expect(ids(result)).toEqual(['meyle', 'mann-spb', 'mann-ms1', 'febi'])
    expect(result).not.toBe(items)
  })

  it('комбинирует наличие, цену и производителя', () => {
    const filters = { ...noFilters, inStockOnly: true, minPrice: '750', brands: ['MANN', 'FEBI'] }
    expect(ids(applyFilters(items, filters))).toEqual(['mann-ms1'])
  })

  it('при заданном диапазоне цен отбрасывает позиции без цены', () => {
    expect(ids(applyFilters(items, { ...noFilters, maxPrice: '900' }))).toEqual(['meyle', 'mann-spb'])
  })

  it('сортирует по цене по убыванию, позиции без цены — в конце', () => {
    expect(ids(applyFilters(items, { ...noFilters, sort: 'price-desc' }))).toEqual([
      'mann-ms1',
      'meyle',
      'mann-spb',
      'febi',
    ])
  })

  it('сортирует по остатку и по дате отгрузки', () => {
    expect(ids(applyFilters(items, { ...noFilters, sort: 'stock-desc' }))[0]).toBe('meyle')
    expect(ids(applyFilters(items, { ...noFilters, sort: 'shipment-asc' }))).toEqual([
      'mann-spb',
      'meyle',
      'mann-ms1',
      'febi',
    ])
    expect(ids(applyFilters(items, { ...noFilters, sort: 'shipment-desc' }))).toEqual([
      'mann-ms1',
      'meyle',
      'mann-spb',
      'febi',
    ])
  })

  it('оставляет только свои склады и скрывает невозвратные', () => {
    const flagged = [
      offer('own', 'A', 100, 1, 'МСК', '', false, { own: true }),
      offer('own-no-refund', 'A', 90, 1, 'МСК', '', false, { own: true, notRefund: true }),
      offer('partner', 'B', 80, 1, 'СПБ'),
    ]
    expect(ids(applyFilters(flagged, { ...noFilters, ownOnly: true }))).toEqual(['own', 'own-no-refund'])
    expect(ids(applyFilters(flagged, { ...noFilters, returnableOnly: true }))).toEqual(['own', 'partner'])
    expect(ids(applyFilters(flagged, { ...noFilters, ownOnly: true, returnableOnly: true }))).toEqual(['own'])
  })

  it('фильтрует по городам склада', () => {
    expect(ids(applyFilters(items, { ...noFilters, cities: ['СПБ'] }))).toEqual(['mann-spb'])
  })
})

describe('filtersSlice', () => {
  it('сбрасывает фильтры при выборе другого производителя', () => {
    let state = filtersReducer(noFilters, setInStockOnly(true))
    state = filtersReducer(state, toggleBrand('MANN'))
    expect(selectHasActiveFilters({ filters: state })).toBe(true)

    state = filtersReducer(state, {
      type: fetchOffers.pending.type,
      meta: { arg: { number: '1', brand: 'X' }, requestId: 'r1' },
    })
    expect(state).toEqual(noFilters)
  })

  it('сортирует производителей по суммарному остатку, без товара — внизу', () => {
    const brands = selectOfferBrands({ search: { offers: { items } } })
    expect(brands).toEqual([
      { value: 'MEYLE', stock: 20 },
      { value: 'MANN', stock: 7 },
      { value: 'FEBI', stock: 0 },
    ])
  })

  it('собирает города складов с остатком, без товара — внизу, без пустого города', () => {
    const cities = selectOfferCities({ search: { offers: { items } } })
    expect(cities).toEqual([
      { value: 'МСК', stock: 24 },
      { value: 'СПБ', stock: 3 },
    ])
  })

  it('мемоизирует отфильтрованный список', () => {
    const state = {
      search: { offers: { items } },
      filters: filtersReducer(noFilters, setMinPrice('800')),
    }
    const first = selectVisibleOffers(state)
    expect(ids(first)).toEqual(['meyle', 'mann-ms1'])
    expect(selectVisibleOffers({ ...state })).toBe(first)
  })
})

describe('priceScale', () => {
  it('округляет края наружу и берёт круглый шаг', () => {
    expect(priceScale([139, 870.5, 2137])).toEqual({ min: 100, max: 2200, step: 50 })
    expect(priceScale([597.86, 1067.26])).toEqual({ min: 580, max: 1080, step: 5 })
    expect(priceScale([120.13, 754.8])).toEqual({ min: 120, max: 760, step: 10 })
    expect(priceScale([3, 48])).toEqual({ min: 2, max: 48, step: 1 })
  })

  it('не нужен, если двигать нечего', () => {
    expect(priceScale([])).toBeNull()
    expect(priceScale([500])).toBeNull()
    expect(priceScale([500, 500])).toBeNull()
  })
})
