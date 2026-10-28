import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_LEARNED, findInCatalog, learn, mergeEntries, readLearned } from './index'

const entry = (brand, number, name, count = 0) => ({ brand, number, name, count })

const entries = [
  entry('MANN', 'W712/75', 'Масляный фильтр', 3),
  entry('MAHLE', 'OC90', 'Фильтр масляный двигателя', 5),
  entry('BOSCH', 'F026402', 'Фильтр топливный'),
  entry('FEBI', '01089', 'Стеклоподъёмник задний левый'),
]
const numbers = (list) => list.map((item) => item.number)

describe('findInCatalog', () => {
  it('ищет по началу слов, порядок слов не важен', () => {
    expect(numbers(findInCatalog(entries, 'фильтр масл'))).toEqual(['W712/75', 'OC90'])
    expect(numbers(findInCatalog(entries, 'ФИЛЬТ'))).toEqual(['W712/75', 'OC90', 'F026402'])
  })

  it('не различает ё и е, регистр и лишние пробелы', () => {
    expect(numbers(findInCatalog(entries, '  стеклоподъемник   ЗАД '))).toEqual(['01089'])
  })

  it('ищет и по производителю, в том числе вместе с названием', () => {
    expect(numbers(findInCatalog(entries, 'mahle'))).toEqual(['OC90'])
    expect(numbers(findInCatalog(entries, 'фильтр bosch'))).toEqual(['F026402'])
    expect(findInCatalog(entries, 'колодки mahle')).toEqual([])
  })

  it('не различает твёрдый и мягкий знак', () => {
    expect(numbers(findInCatalog(entries, 'стеклоподьемник'))).toEqual(['01089'])
    expect(numbers(findInCatalog(entries, 'СТЕКЛОПОДЬЁМ'))).toEqual(['01089'])
  })

  it('не ищет по середине слова и по пустому запросу', () => {
    expect(findInCatalog(entries, 'тр')).toEqual([])
    expect(findInCatalog(entries, '   ')).toEqual([])
  })
})

describe('mergeEntries', () => {
  it('убирает дубли по бренду и артикулу, новая запись заменяет старую', () => {
    const merged = mergeEntries(entries, [entry('mahle', 'oc90', 'Фильтр масляный', 7)])
    expect(merged).toHaveLength(4)
    expect(merged.at(-1)).toEqual(entry('mahle', 'oc90', 'Фильтр масляный', 7))
  })

  it('вытесняет самые старые записи сверх лимита', () => {
    const merged = mergeEntries(entries, [entry('NGK', 'BKR6E', 'Свеча зажигания')], 3)
    expect(numbers(merged)).toEqual(['F026402', '01089', 'BKR6E'])
  })
})

describe('learn', () => {
  afterEach(() => vi.unstubAllGlobals())

  const stubStorage = (setItem) => {
    const data = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key) => data.get(key) ?? null,
      setItem: setItem ?? ((key, value) => data.set(key, value)),
    })
    return data
  }

  it('сохраняет записи с версией и читает их обратно', () => {
    const data = stubStorage()
    learn(entries)
    expect(JSON.parse([...data.values()][0]).version).toBe(1)
    expect(readLearned()).toEqual(entries)
  })

  it('не падает, если хранилище переполнено или недоступно', () => {
    stubStorage(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => learn(entries)).not.toThrow()
    expect(readLearned()).toEqual([])

    vi.stubGlobal('localStorage', undefined)
    expect(() => learn(entries)).not.toThrow()
  })

  it('держит не больше MAX_LEARNED записей', () => {
    stubStorage()
    const many = Array.from({ length: MAX_LEARNED + 10 }, (_, i) => entry('B', `N${i}`, 'Деталь'))
    learn(many)
    expect(readLearned()).toHaveLength(MAX_LEARNED)
    expect(readLearned()[0].number).toBe('N10')
  })
})
