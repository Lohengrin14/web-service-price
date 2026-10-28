import { describe, expect, it } from 'vitest'
import { ApiError, extractBrands, extractOffers, parseGoods } from './favorit'

// Ответы построены по описанию полей в документации API
const warehouse = (code, price, stock, shipmentDate = '2026-10-29T14:00:00') => ({
  code,
  id: code,
  own: true,
  shipmentDate,
  price,
  stock,
})

describe('parseGoods', () => {
  it('возвращает массив goods', () => {
    const goods = parseGoods({ goods: [{ brand: 'MEYLE', number: '7160500039S', name: 'Фильтр' }] })
    expect(goods).toHaveLength(1)
  })

  it('превращает «массив с пустой структурой» в пустой список', () => {
    const empty = { goodsID: '', brand: '', number: '', name: '', count: 0, warehouses: [] }
    expect(parseGoods({ goods: [empty] })).toEqual([])
  })

  it('переводит известные ошибки API', () => {
    expect(() => parseGoods({ error: 'Invalid key client!' })).toThrow(ApiError)
    expect(() => parseGoods({ error: 'Invalid key client!' })).toThrow(/Неверный ключ API/)
  })

  it('показывает неизвестную ошибку как есть', () => {
    expect(() => parseGoods({ error: 'Something odd' })).toThrow('Сервис вернул ошибку: Something odd')
  })

  it('ругается на ответ неожиданного формата', () => {
    expect(() => parseGoods({ foo: 1 })).toThrow(/неожиданного формата/)
  })
})

describe('extractBrands', () => {
  it('убирает дубли и суммирует остаток', () => {
    const brands = extractBrands([
      { brand: 'ZEN', number: '0189', name: 'Бендикс', count: 2 },
      { brand: 'CAFFARO', number: '0189', name: 'Ролик', count: 0 },
      { brand: 'ZEN', number: '0189', name: 'Бендикс', count: 3 },
    ])
    expect(brands.map((b) => b.brand)).toEqual(['CAFFARO', 'ZEN'])
    expect(brands[1].count).toBe(5)
  })
})

describe('extractOffers', () => {
  const response = [
    {
      brand: 'MEYLE',
      number: '7160500039S',
      name: 'Фильтр масляный',
      count: 20,
      price: 1, // устаревшее поле, использоваться не должно
      warehouses: [warehouse('МС2', 850.5, 20)],
      analogues: [
        {
          brand: 'MANN',
          number: 'HU7020Z',
          name: 'Фильтр масляный',
          count: 7,
          warehouses: [warehouse('МС1', 990, 4), warehouse('СПБ', 700, 3)],
        },
        { brand: 'FEBI', number: '38825', name: 'Фильтр масляный', count: 0, warehouses: [] },
        { brand: '', number: '', name: '' },
      ],
    },
  ]

  it('делает строку на каждое предложение склада и берёт цену со склада', () => {
    const offers = extractOffers(response)
    expect(offers).toHaveLength(4)
    expect(offers[0]).toMatchObject({ brand: 'MEYLE', isOriginal: true, price: 850.5, stock: 20 })
  })

  it('сортирует аналоги: сначала в наличии по цене, потом без остатка', () => {
    const analogues = extractOffers(response).filter((offer) => !offer.isOriginal)
    expect(analogues.map((offer) => [offer.brand, offer.price, offer.stock])).toEqual([
      ['MANN', 700, 3],
      ['MANN', 990, 4],
      ['FEBI', null, 0],
    ])
  })

  it('не дублирует деталь, если она попала и в goods, и в аналоги', () => {
    const offers = extractOffers([{ ...response[0], analogues: [response[0]] }])
    expect(offers.filter((offer) => offer.brand === 'MEYLE')).toHaveLength(1)
  })
})
