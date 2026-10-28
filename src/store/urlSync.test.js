import { describe, expect, it } from 'vitest'
import { readSearch, searchToQuery } from './urlSync'

describe('readSearch', () => {
  it('читает и нормализует артикул и производителя из ссылки', () => {
    expect(readSearch('?number=%20oc90%20&brand=MAHLE')).toEqual({ query: '', number: 'OC90', brand: 'MAHLE' })
    expect(readSearch('')).toEqual({ query: '', number: '', brand: '' })
  })

  it('понимает спецсимволы в производителе', () => {
    expect(readSearch('?number=01089&brand=Meat+%26+Doria').brand).toBe('Meat & Doria')
  })
})

describe('поиск по названию в ссылке', () => {
  it('читает и пишет ?q=', () => {
    expect(readSearch('?q=%20фильтр%20%20масляный').query).toBe('фильтр масляный')
    expect(searchToQuery({ query: 'колодки', number: '', selected: null })).toBe(
      'q=%D0%BA%D0%BE%D0%BB%D0%BE%D0%B4%D0%BA%D0%B8',
    )
  })
})

describe('searchToQuery', () => {
  it('пишет артикул и выбранного производителя', () => {
    expect(searchToQuery({ number: '01089', selected: { brand: 'Meat & Doria', number: '01089' } })).toBe(
      'number=01089&brand=Meat+%26+Doria',
    )
    expect(searchToQuery({ number: '01089', selected: null })).toBe('number=01089')
    expect(searchToQuery({ number: '', selected: null })).toBe('')
  })

  it('сохраняет язык, если он не русский', () => {
    expect(searchToQuery({ number: 'OC90', selected: null }, 'en')).toBe('number=OC90&lang=en')
    expect(searchToQuery({ number: 'OC90', selected: null }, 'ru')).toBe('number=OC90')
  })
})
