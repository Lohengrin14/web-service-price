import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readLearned } from '../catalog'
import { catalogListener } from './catalogListener'
import searchReducer, { fetchOffers } from './searchSlice'

describe('catalogListener', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('запоминает детали из предложений, суммируя остаток по складам', () => {
    const data = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    })
    const store = configureStore({
      reducer: { search: searchReducer },
      middleware: (getDefault) => getDefault().prepend(catalogListener.middleware),
    })

    const row = { partKey: 'MANN|W712', name: 'Масляный фильтр', number: 'W712', brand: 'MANN' }
    store.dispatch(
      fetchOffers.fulfilled([{ ...row, stock: 3 }, { ...row, stock: 4 }], 'r1', {
        number: 'W712',
        brand: 'MANN',
      }),
    )

    expect(readLearned()).toEqual([{ name: 'Масляный фильтр', number: 'W712', brand: 'MANN', count: 7 }])
  })
})
