import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { extractBrands, extractOffers, requestGoods } from '../api/favorit'
import { canonicalNumber } from '../utils/format'

const isSameNumber = (a, b) => canonicalNumber(a) === canonicalNumber(b)

// Этап 2: предложения и аналоги по номеру и бренду
export const fetchOffers = createAsyncThunk(
  'search/fetchOffers',
  async ({ number, brand }) => extractOffers(await requestGoods({ number, brand, analogues: 'on' })),
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
  async ({ number, brand }, { dispatch, getState, requestId }) => {
    const brands = extractBrands(await requestGoods({ number }))

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

// status: 'idle' | 'loading' | 'succeeded' | 'failed'
const emptyRequest = { items: [], status: 'idle', error: null, requestId: null }

const initialState = {
  number: '', // артикул последнего поиска
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
      .addCase(fetchBrands.pending, (state, action) => {
        state.number = action.meta.arg.number
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
        state.brands.error = action.error.message
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
        state.offers.error = action.error.message
      })
  },
})

export const { resetSearch } = searchSlice.actions
export const selectSearch = (state) => state.search
export default searchSlice.reducer
