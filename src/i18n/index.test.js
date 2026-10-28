import { describe, expect, it } from 'vitest'
import en from './en'
import { translate, translateError } from './index'
import ru from './ru'

describe('словари', () => {
  it('в ru и en одинаковый набор ключей', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
  })

  it('у множественных форм есть все нужные языку варианты', () => {
    for (const [key, value] of Object.entries(ru)) {
      if (typeof value !== 'object') continue
      expect(Object.keys(value).sort(), key).toEqual(['few', 'many', 'one', 'other'])
    }
    for (const [key, value] of Object.entries(en)) {
      if (typeof value !== 'object') continue
      expect(Object.keys(value).sort(), key).toEqual(['one', 'other'])
    }
  })
})

describe('translate', () => {
  it('подставляет параметры и склоняет по-русски и по-английски', () => {
    const forms = [1, 3, 5, 21].map((count) => translate('ru', 'offers.count', { count }))
    expect(forms).toEqual(['1 предложение', '3 предложения', '5 предложений', '21 предложение'])
    expect(translate('en', 'offers.count', { count: 1 })).toBe('1 offer')
    expect(translate('en', 'offers.count', { count: 5 })).toBe('5 offers')
    expect(translate('en', 'filters.matching', { shown: 3, count: 10 })).toBe('Matching: 3 of 10 offers')
  })

  it('без ключа показывает сам ключ, чтобы пропуск был заметен', () => {
    expect(translate('en', 'no.such.key')).toBe('no.such.key')
  })
})

describe('translateError', () => {
  it('собирает текст из кодов на нужном языке', () => {
    const error = { codes: ['unavailable'], params: { status: 503 } }
    expect(translateError('ru', error)).toBe('Сервис недоступен (HTTP 503). Попробуйте позже.')
    expect(translateError('en', error)).toBe('The service is unavailable (HTTP 503). Please try again later.')
    expect(translateError('en', null)).toBe('Something went wrong.')
  })
})
