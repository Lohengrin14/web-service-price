import { describe, expect, it } from 'vitest'
import filtersReducer, {
  applyFilters,
  selectHasActiveFilters,
  selectOfferBrands,
  selectOfferCities,
  selectVisibleOffers,
  setInStockOnly,
  setMinPrice,
  toggleBrand,
} from './filtersSlice'
import { fetchOffers } from './searchSlice'

const offer = (id, brand, price, stock, city, shipmentDate = '', isOriginal = false) => ({
  id,
  brand,
  price,
  stock,
  city,
  shipmentDate,
  isOriginal,
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

  it('собирает города складов с остатком, без товара — внизу', () => {
    const cities = selectOfferCities({ search: { offers: { items } } })
    expect(cities).toEqual([
      { value: 'МСК', stock: 24 },
      { value: 'СПБ', stock: 3 },
      { value: '', stock: 0 },
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
