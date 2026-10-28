import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ApiError, extractBrands, extractOffers, requestGoods } from '../api/favorit'
import { searchCatalog } from '../catalog'
import { canonicalNumber, normalizeNumber } from '../utils/format'

const isSameNumber = (a, b) => canonicalNumber(a) === canonicalNumber(b)

// Кэш ответов на время сессии: повтор того же запроса («назад», возврат к уже открытому
// производителю) не тратит квоту API. Храним только успешные ответы, недолго и немного —
// цены и остатки меняются.
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_SIZE = 20
const cache = new Map()

async function cached(key, load) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) return hit.value

  const value = await load()
  cache.delete(key)
  cache.set(key, { value, time: Date.now() })
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value)
  return value
}

export const clearResponseCache = () => cache.clear()

// Ошибки API кладём в стор кодами ({ codes, params }), а не готовым текстом:
// текст на выбранном языке подставит интерфейс, и он сменится вместе с языком
function rejectApiError(error, rejectWithValue) {
  if (error instanceof ApiError) return rejectWithValue({ codes: error.codes, params: error.params })
  throw error
}

const errorOf = (action) => action.payload ?? { codes: ['unknown'], params: {} }

// Этап 2: предложения и аналоги по номеру и бренду
export const fetchOffers = createAsyncThunk(
  'search/fetchOffers',
  async ({ number, brand }, { rejectWithValue }) => {
    try {
      return await cached(`offers|${canonicalNumber(number)}|${brand.toUpperCase()}`, async () =>
        // info=on — чтобы API вернул признак невозвратности (notRefund)
        extractOffers(await requestGoods({ number, brand, analogues: 'on', info: 'on' })),
      )
    } catch (error) {
      return rejectApiError(error, rejectWithValue)
    }
  },
  {
    condition: ({ number, brand }, { getState }) => {
      const { selected, offers } = getState().search
      const isSame = isSameNumber(selected?.number, number) && selected?.brand === brand
      return !(isSame && offers.status !== 'failed')
    },
  },
)

// Этап 1: производители по артикулу.
// brand — необязательный производитель, которого открыть сразу (например, из ссылки).
export const fetchBrands = createAsyncThunk(
  'search/fetchBrands',
  async ({ number, brand }, { dispatch, getState, requestId, rejectWithValue }) => {
    let brands
    try {
      brands = await cached(`brands|${canonicalNumber(number)}`, async () =>
        extractBrands(await requestGoods({ number })),
      )
    } catch (error) {
      return rejectApiError(error, rejectWithValue)
    }

    // Сразу открываем производителя из ссылки, а если его нет — первого (с наибольшим остатком),
    // чтобы не ждать клика. Только если за это время не начали новый поиск.
    const preferred = brand?.toUpperCase()
    const target = brands.find((item) => item.brand.toUpperCase() === preferred) ?? brands[0]
    if (target && getState().search.brands.requestId === requestId) {
      dispatch(fetchOffers({ number: target.number, brand: target.brand }))
    }

    return brands
  },
  {
    // Не повторяем запрос по артикулу, который уже найден или ищется (кроме повтора после ошибки).
    // Сравниваем только артикул: brand на список производителей не влияет.
    condition: ({ number }, { getState }) => {
      const { search } = getState()
      return !(isSameNumber(number, search.number) && search.brands.status !== 'failed')
    },
  },
)

// Поиск по названию — по справочнику, без запросов к API. Сначала то, что было в наличии.
// Если в справочнике пусто, всё равно пробуем как артикул: вдруг это номер без цифр.
export const searchByName = createAsyncThunk(
  'search/searchByName',
  async (query, { dispatch, getState, requestId }) => {
    const found = await searchCatalog(query)
    if (found.length === 0 && getState().search.names.requestId === requestId) {
      dispatch(fetchBrands({ number: normalizeNumber(query), fromName: true }))
    }
    return [...found].sort((a, b) => (b.count > 0) - (a.count > 0))
  },
  {
    condition: (query, { getState }) => {
      const { search } = getState()
      return !(query === search.query && search.names.status !== 'failed')
    },
  },
)

// status: 'idle' | 'loading' | 'succeeded' | 'failed'
const emptyRequest = { items: [], status: 'idle', error: null, requestId: null }

const initialState = {
  query: '', // название последнего поиска по справочнику
  names: emptyRequest, // найденные в справочнике детали: [{ name, number, brand, count }]
  number: '', // артикул последнего поиска
  fromName: false, // поиск по артикулу запущен как откат после пустого поиска по названию
  selected: null, // выбранный производитель: { brand, number }
  brands: emptyRequest,
  offers: emptyRequest,
}

// Учитываем только ответ на последний отправленный запрос: старые ответы,
// пришедшие после нового поиска, не должны перетирать результат
const isCurrent = (slot, action) => slot.requestId === action.meta.requestId

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    resetSearch: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchByName.pending, (state, action) => {
        Object.assign(state, initialState)
        state.query = action.meta.arg
        state.names = { ...emptyRequest, status: 'loading', requestId: action.meta.requestId }
      })
      .addCase(searchByName.fulfilled, (state, action) => {
        if (!isCurrent(state.names, action)) return
        state.names.items = action.payload
        state.names.status = 'succeeded'
      })
      .addCase(searchByName.rejected, (state, action) => {
        if (!isCurrent(state.names, action)) return
        state.names.status = 'failed'
        state.names.error = errorOf(action)
      })
      // Поиск по артикулу (в том числе выбор детали из справочника) закрывает поиск по названию
      .addCase(fetchBrands.pending, (state, action) => {
        state.query = ''
        state.names = emptyRequest
        state.number = action.meta.arg.number
        state.fromName = Boolean(action.meta.arg.fromName)
        state.selected = null
        state.brands = { ...emptyRequest, status: 'loading', requestId: action.meta.requestId }
        state.offers = emptyRequest
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        if (!isCurrent(state.brands, action)) return
        state.brands.items = action.payload
        state.brands.status = 'succeeded'
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        if (!isCurrent(state.brands, action)) return
        state.brands.status = 'failed'
        state.brands.error = errorOf(action)
      })
      .addCase(fetchOffers.pending, (state, action) => {
        const { brand, number } = action.meta.arg
        state.selected = { brand, number }
        state.offers = { ...emptyRequest, status: 'loading', requestId: action.meta.requestId }
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        if (!isCurrent(state.offers, action)) return
        state.offers.items = action.payload
        state.offers.status = 'succeeded'
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        if (!isCurrent(state.offers, action)) return
        state.offers.status = 'failed'
        state.offers.error = errorOf(action)
      })
  },
})

export const { resetSearch } = searchSlice.actions
export const selectSearch = (state) => state.search
export default searchSlice.reducer
