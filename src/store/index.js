import { configureStore } from '@reduxjs/toolkit'
import { catalogListener } from './catalogListener'
import filtersReducer from './filtersSlice'
import langReducer from './langSlice'
import searchReducer from './searchSlice'

export const store = configureStore({
  reducer: {
    search: searchReducer,
    filters: filtersReducer,
    lang: langReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(catalogListener.middleware),
})
