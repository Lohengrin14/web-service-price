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

    await store.dispatch(fetchBrands({ number: '01089' }))

    expect(store.getState().search.selected).toEqual({ brand: 'FEBI', number: '01089' })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1][0]).toContain('brand=FEBI')
  })

  it('открывает производителя из ссылки, если он есть в ответе', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) =>
        url.includes('analogues=on')
          ? jsonResponse({ goods: [] })
          : jsonResponse({
              goods: [
                { brand: 'FEBI', number: '01089', count: 845 },
                { brand: 'GLASER', number: 'H01089-00', count: 0 },
              ],
            }),
      ),
    )
    const store = configureStore({ reducer: { search: searchReducer } })

    await store.dispatch(fetchBrands({ number: '01089', brand: 'glaser' }))

    expect(store.getState().search.selected).toEqual({ brand: 'GLASER', number: 'H01089-00' })
  })

  it('не перезапрашивает тот же артикул в другом написании', async () => {
    const fetch = vi.fn(async () => jsonResponse({ goods: [] }))
    vi.stubGlobal('fetch', fetch)
    const store = configureStore({ reducer: { search: searchReducer } })

    await store.dispatch(fetchBrands({ number: 'OC90' }))
    await store.dispatch(fetchBrands({ number: 'OC-90' }))
    await store.dispatch(fetchBrands({ number: 'OC 90', brand: 'MAHLE' }))

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('ничего не выбирает, если производителей нет', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ goods: [{ brand: '', number: '' }] })))
    const store = configureStore({ reducer: { search: searchReducer } })

    await store.dispatch(fetchBrands({ number: '000' }))

    expect(store.getState().search.selected).toBeNull()
    expect(store.getState().search.offers.status).toBe('idle')
  })
})
