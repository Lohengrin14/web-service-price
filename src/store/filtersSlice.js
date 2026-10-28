import { createSelector, createSlice, isAnyOf } from '@reduxjs/toolkit'
import { shipmentTime } from '../utils/format'
import { fetchBrands, fetchOffers, resetSearch } from './searchSlice'

// Фильтры и сортировка работают поверх offers.items и сами данные не меняют
const initialState = {
  minPrice: '', // строки как в полях ввода; пустая строка — без ограничения
  maxPrice: '',
  inStockOnly: false,
  ownOnly: false, // только собственные склады Фаворита
  returnableOnly: false, // скрыть невозвратные предложения
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
    setOwnOnly: (state, action) => {
      state.ownOnly = action.payload
    },
    setReturnableOnly: (state, action) => {
      state.returnableOnly = action.payload
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
export function applyFilters(
  items,
  { minPrice, maxPrice, inStockOnly, ownOnly, returnableOnly, brands, cities, sort },
) {
  const min = parseLimit(minPrice)
  const max = parseLimit(maxPrice)
  const checkedBrands = new Set(brands)
  const checkedCities = new Set(cities)

  const result = items.filter((offer) => {
    if (inStockOnly && offer.stock <= 0) return false
    if (ownOnly && !offer.own) return false
    if (returnableOnly && offer.notRefund) return false
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

// Варианты для чекбоксов: { value, stock } по полю field, остаток берём из stockField.
// Сначала с наибольшим суммарным остатком, варианты без товара — внизу.
export function summarizeStock(items, field, stockField = 'stock') {
  const stocks = new Map()
  for (const item of items) {
    stocks.set(item[field], (stocks.get(item[field]) ?? 0) + item[stockField])
  }

  return [...stocks]
    .map(([value, stock]) => ({ value, stock }))
    .sort((a, b) => b.stock - a.stock || a.value.localeCompare(b.value, 'ru'))
}

// «Круглые» единицы от крупных к мелким: …, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1
function niceUnits(span) {
  const units = []
  for (let power = 10 ** Math.ceil(Math.log10(span)); power >= 1; power /= 10) {
    units.push(power, power / 2, power / 5)
  }
  return units.filter((unit) => unit >= 1)
}

// Шкала ползунка цены: края округлены наружу до самой крупной круглой единицы, при которой
// шкала длиннее реального разброса цен не больше чем на 10 % (139…2137 → 100…2200,
// 598…1067 → 580…1080). Шаг — круглый, около сотой доли шкалы. null — если двигать нечего.
export function priceScale(prices) {
  if (prices.length < 2) return null
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  const span = high - low
  if (span === 0) return null

  const fits = (unit) => Math.ceil(high / unit) * unit - Math.floor(low / unit) * unit <= span * 1.1
  const unit = niceUnits(span).find(fits) ?? 1
  const min = Math.floor(low / unit) * unit
  const max = Math.ceil(high / unit) * unit
  const raw = (max - min) / 100
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = Math.max(1, [1, 2, 5, 10].map((k) => k * power).find((value) => value >= raw))

  return { min, max, step }
}

const selectOfferItems = (state) => state.search.offers.items
export const selectFilters = (state) => state.filters

export const selectVisibleOffers = createSelector([selectOfferItems, selectFilters], applyFilters)

export const selectOfferBrands = createSelector([selectOfferItems], (items) =>
  summarizeStock(items, 'brand'),
)

// Шкала считается по всей выдаче, а не по отфильтрованной — иначе края прыгали бы при фильтрации
export const selectPriceScale = createSelector([selectOfferItems], (items) =>
  priceScale(items.map((offer) => offer.price).filter((price) => price !== null)),
)

// Предложения без склада (пустой город) в список городов не попадают: выбрать их по городу нельзя
export const selectOfferCities = createSelector([selectOfferItems], (items) =>
  summarizeStock(
    items.filter((offer) => offer.city),
    'city',
  ),
)

export const selectHasActiveFilters = (state) =>
  Object.keys(initialState).some((name) => state.filters[name] !== initialState[name])

export const {
  setMinPrice,
  setMaxPrice,
  setInStockOnly,
  setOwnOnly,
  setReturnableOnly,
  toggleBrand,
  setBrands,
  toggleCity,
  setCities,
  setSort,
  resetFilters,
} = filtersSlice.actions
export default filtersSlice.reducer
