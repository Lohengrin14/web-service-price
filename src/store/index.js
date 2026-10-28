import { configureStore } from '@reduxjs/toolkit'
import { catalogListener } from './catalogListener'
import filtersReducer from './filtersSlice'
import searchReducer from './searchSlice'

export const store = configureStore({
  reducer: {
    search: searchReducer,
    filters: filtersReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(catalogListener.middleware),
})
