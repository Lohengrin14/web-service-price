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

  it('превращает известные ошибки API в коды', () => {
    expect.assertions(2)
    expect(() => parseGoods({ error: 'Invalid key client!' })).toThrow(ApiError)
    try {
      parseGoods({ error: ['Empty key!', 'Request quota exceeded!'] })
    } catch (error) {
      expect(error.codes).toEqual(['emptyKey', 'quota'])
    }
  })

  it('неизвестную ошибку передаёт текстом в параметрах', () => {
    try {
      parseGoods({ error: 'Something odd' })
    } catch (error) {
      expect(error.codes).toEqual(['apiError'])
      expect(error.params).toEqual({ text: 'Something odd' })
    }
    expect.assertions(2)
  })

  it('ругается на ответ неожиданного формата', () => {
    expect(() => parseGoods({ foo: 1 })).toThrow('badFormat')
  })
})

describe('extractBrands', () => {
  it('убирает дубли и суммирует остаток', () => {
    const brands = extractBrands([
      { brand: 'ZEN', number: '0189', name: 'Бендикс', count: 2 },
      { brand: 'CAFFARO', number: '0189', name: 'Ролик', count: 0 },
      { brand: 'ZEN', number: '0189', name: 'Бендикс', count: 3 },
    ])
    expect(brands.map((b) => [b.brand, b.count])).toEqual([
      ['ZEN', 5],
      ['CAFFARO', 0],
    ])
  })

  it('сортирует по остатку, без товара — внизу, при равенстве — по алфавиту', () => {
    const brands = extractBrands([
      { brand: 'AP', number: '1', count: 0 },
      { brand: 'OSSCA', number: '1', count: 50 },
      { brand: 'FEBI', number: '1', count: 845 },
      { brand: 'ASAM', number: '1', count: 0 },
    ])
    expect(brands.map((b) => b.brand)).toEqual(['FEBI', 'OSSCA', 'AP', 'ASAM'])
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
          warehouses: [warehouse('МСК РС', 990, 4), warehouse('СПБ', 700, 3)],
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

  it('берёт город склада из первого слова кода', () => {
    const cities = extractOffers(response).map((offer) => offer.city)
    expect(cities).toEqual(['МС2', 'СПБ', 'МСК', ''])
  })

  it('не дублирует деталь, если она попала и в goods, и в аналоги', () => {
    const offers = extractOffers([{ ...response[0], analogues: [response[0]] }])
    expect(offers.filter((offer) => offer.brand === 'MEYLE')).toHaveLength(1)
  })
})
