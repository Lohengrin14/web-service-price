import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { extractBrands, extractOffers, requestGoods } from '../api/favorit'

// Этап 1: производители по артикулу
export const fetchBrands = createAsyncThunk(
  'search/fetchBrands',
  async (number) => extractBrands(await requestGoods({ number })),
  {
    // Не повторяем запрос по артикулу, который уже найден или ищется (кроме повтора после ошибки)
    condition: (number, { getState }) => {
      const { search } = getState()
      return !(number === search.number && search.brands.status !== 'failed')
    },
  },
)

// Этап 2: предложения и аналоги по номеру и бренду
export const fetchOffers = createAsyncThunk(
  'search/fetchOffers',
  async ({ number, brand }) => extractOffers(await requestGoods({ number, brand, analogues: 'on' })),
  {
    condition: ({ number, brand }, { getState }) => {
      const { selected, offers } = getState().search
      const isSame = selected?.number === number && selected?.brand === brand
      return !(isSame && offers.status !== 'failed')
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
        state.number = action.meta.arg
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
