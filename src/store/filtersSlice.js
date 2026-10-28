import { createSelector, createSlice, isAnyOf } from '@reduxjs/toolkit'
import { shipmentTime } from '../utils/format'
import { fetchBrands, fetchOffers, resetSearch } from './searchSlice'

// Фильтры и сортировка работают поверх offers.items и сами данные не меняют
const initialState = {
  minPrice: '', // строки как в полях ввода; пустая строка — без ограничения
  maxPrice: '',
  inStockOnly: false,
  brands: [], // отмеченные производители; никто не отмечен — показываем всех
  cities: [], // отмеченные города складов; так же: пусто — все
  sort: 'default', // ключ из SORTERS или 'default'
}

const toggle = (list, value) =>
  list.includes(value) ? list.filter((checked) => checked !== value) : [...list, value]

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setMinPrice: (state, action) => {
      state.minPrice = action.payload
    },
    setMaxPrice: (state, action) => {
      state.maxPrice = action.payload
    },
    setInStockOnly: (state, action) => {
      state.inStockOnly = action.payload
    },
    toggleBrand: (state, action) => {
      state.brands = toggle(state.brands, action.payload)
    },
    setBrands: (state, action) => {
      state.brands = action.payload
    },
    toggleCity: (state, action) => {
      state.cities = toggle(state.cities, action.payload)
    },
    setCities: (state, action) => {
      state.cities = action.payload
    },
    setSort: (state, action) => {
      state.sort = action.payload
    },
    resetFilters: () => initialState,
  },
  extraReducers: (builder) => {
    // Новый поиск по артикулу или другой производитель — начинаем с чистых фильтров
    builder.addMatcher(isAnyOf(fetchBrands.pending, fetchOffers.pending, resetSearch), () => initialState)
  },
})

function parseLimit(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(String(value).replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

// Позиции без цены или даты (null) при сортировке всегда уходят в конец
const nullsLast = (getValue, direction = 1) => (a, b) => {
  const x = getValue(a)
  const y = getValue(b)
  if (x === y) return 0
  if (x === null) return 1
  if (y === null) return -1
  return (x - y) * direction
}

const SORTERS = {
  'price-asc': nullsLast((offer) => offer.price),
  'price-desc': nullsLast((offer) => offer.price, -1),
  'stock-desc': (a, b) => b.stock - a.stock,
  'stock-asc': (a, b) => a.stock - b.stock,
  'shipment-asc': nullsLast((offer) => shipmentTime(offer.shipmentDate)),
  'shipment-desc': nullsLast((offer) => shipmentTime(offer.shipmentDate), -1),
}

// Фильтрует и сортирует предложения. Исходный массив не меняется.
// Сортировка устойчивая: при равных значениях сохраняется порядок по умолчанию.
export function applyFilters(items, { minPrice, maxPrice, inStockOnly, brands, cities, sort }) {
  const min = parseLimit(minPrice)
  const max = parseLimit(maxPrice)
  const checkedBrands = new Set(brands)
  const checkedCities = new Set(cities)

  const result = items.filter((offer) => {
    if (inStockOnly && offer.stock <= 0) return false
    if (checkedBrands.size > 0 && !checkedBrands.has(offer.brand)) return false
    if (checkedCities.size > 0 && !checkedCities.has(offer.city)) return false
    // Если задан диапазон цен, позиции без цены в него не попадают
    if ((min !== null || max !== null) && offer.price === null) return false
    if (min !== null && offer.price < min) return false
    if (max !== null && offer.price > max) return false
    return true
  })

  const sorter = SORTERS[sort]
  return sorter ? result.sort(sorter) : result
}

// Варианты для чекбоксов: { value, stock } по полю предложения.
// Сначала с наибольшим суммарным остатком, варианты без товара — внизу.
function summarizeStock(items, field) {
  const stocks = new Map()
  for (const offer of items) {
    stocks.set(offer[field], (stocks.get(offer[field]) ?? 0) + offer.stock)
  }

  return [...stocks]
    .map(([value, stock]) => ({ value, stock }))
    .sort((a, b) => b.stock - a.stock || a.value.localeCompare(b.value, 'ru'))
}

const selectOfferItems = (state) => state.search.offers.items
export const selectFilters = (state) => state.filters

export const selectVisibleOffers = createSelector([selectOfferItems, selectFilters], applyFilters)

export const selectOfferBrands = createSelector([selectOfferItems], (items) =>
  summarizeStock(items, 'brand'),
)

export const selectOfferCities = createSelector([selectOfferItems], (items) =>
  summarizeStock(items, 'city'),
)

export const selectHasActiveFilters = (state) =>
  Object.keys(initialState).some((name) => state.filters[name] !== initialState[name])

export const {
  setMinPrice,
  setMaxPrice,
  setInStockOnly,
  toggleBrand,
  setBrands,
  toggleCity,
  setCities,
  setSort,
  resetFilters,
} = filtersSlice.actions
export default filtersSlice.reducer
