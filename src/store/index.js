import { configureStore } from '@reduxjs/toolkit'
import filtersReducer from './filtersSlice'
import searchReducer from './searchSlice'

export const store = configureStore({
  reducer: {
    search: searchReducer,
    filters: filtersReducer,
  },
})
