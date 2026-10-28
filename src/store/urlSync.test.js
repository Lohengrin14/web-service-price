import { describe, expect, it } from 'vitest'
import { readSearch, searchToQuery } from './urlSync'

describe('readSearch', () => {
  it('читает и нормализует артикул и производителя из ссылки', () => {
    expect(readSearch('?number=%20oc90%20&brand=MAHLE')).toEqual({ number: 'OC90', brand: 'MAHLE' })
    expect(readSearch('')).toEqual({ number: '', brand: '' })
  })

  it('понимает спецсимволы в производителе', () => {
    expect(readSearch('?number=01089&brand=Meat+%26+Doria').brand).toBe('Meat & Doria')
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
})
