import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import searchReducer, { fetchBrands } from './searchSlice'

const jsonResponse = (data) => new Response(JSON.stringify(data))

describe('fetchBrands', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('сразу загружает предложения первого производителя — с наибольшим остатком', async () => {
    const fetch = vi.fn(async (url) =>
      url.includes('analogues=on')
        ? jsonResponse({ goods: [] })
        : jsonResponse({
            goods: [
              { brand: 'AP', number: '01089', count: 0 },
              { brand: 'FEBI', number: '01089', count: 845 },
            ],
          }),
    )
    vi.stubGlobal('fetch', fetch)
    const store = configureStore({ reducer: { search: searchReducer } })

    await store.dispatch(fetchBrands('01089'))

    expect(store.getState().search.selected).toEqual({ brand: 'FEBI', number: '01089' })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1][0]).toContain('brand=FEBI')
  })

  it('ничего не выбирает, если производителей нет', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ goods: [{ brand: '', number: '' }] })))
    const store = configureStore({ reducer: { search: searchReducer } })

    await store.dispatch(fetchBrands('000'))

    expect(store.getState().search.selected).toBeNull()
    expect(store.getState().search.offers.status).toBe('idle')
  })
})
