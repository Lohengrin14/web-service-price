// Клиент сервиса «Проценка» Фаворит Автозапчасти.
// Документация: https://lk.favorit-parts.ru/static/wsprice.pdf
//
// Обычно браузер обращается к прокси (/api/search), прокси добавляет ключ и пересылает запрос в API.
// В статической сборке для GitHub Pages прокси нет: VITE_API_URL указывает прямо на API
// (он работает по HTTPS и разрешает CORS), а ключ — публичный демо-ключ из документации.
// Здесь же весь разбор ответа: остальное приложение формат API не знает.

import { PUBLIC_DEMO_KEY } from '../config'

const API_URL = import.meta.env.VITE_API_URL || '/api/search'
const DEMO_KEY = import.meta.env.VITE_USE_DEMO_KEY === 'true' ? PUBLIC_DEMO_KEY : ''
const TIMEOUT_MS = 15_000

// Ошибки из документации → коды. Текст для пользователя берётся из словаря (src/i18n, errors.*),
// поэтому он показывается на выбранном языке.
const KNOWN_ERRORS = {
  'Empty key!': 'emptyKey',
  'Invalid key client!': 'invalidKey',
  'Empty number goods!': 'emptyNumber',
  // По документации квота действует на поиск грузовых запчастей
  'Request quota exceeded!': 'quota',
}

// codes — ключи ошибок (errors.<код> в словаре), params — подстановки в текст
export class ApiError extends Error {
  name = 'ApiError'

  constructor(codes, params = {}, options) {
    const list = Array.isArray(codes) ? codes : [codes]
    super(list.join(', '), options)
    this.codes = list
    this.params = params
  }
}

// Ответ с полем error → { codes, params }. В одном ответе может быть несколько ошибок.
export function describeApiError(error) {
  const parts = Array.isArray(error) ? error : [error]
  const text = parts
    .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
    .join(' ')
    .trim()

  const known = Object.entries(KNOWN_ERRORS)
    .filter(([original]) => text.includes(original))
    .map(([, code]) => code)

  return known.length > 0 ? { codes: known, params: {} } : { codes: ['apiError'], params: { text } }
}

// «Не найдено» API возвращает как массив с одной пустой структурой — такие элементы отбрасываем
function isRealItem(item) {
  return Boolean(item) && typeof item === 'object' && Boolean(item.brand || item.number || item.name)
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number =
    typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

// Город склада — первое слово кода: «МСК РС» → «МСК», «РнД РС» → «РНД»
const cityOf = (code) => (code || '').trim().split(/\s+/)[0].toUpperCase()

const partKey = (item) => `${item.brand ?? ''}|${item.number ?? ''}`.toUpperCase()

function parseJson(text) {
  try {
    return JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    return undefined
  }
}

// Разбирает тело ответа: ошибку API превращает в ApiError, «не найдено» — в пустой массив
export function parseGoods(data) {
  if (data?.error) {
    const { codes, params } = describeApiError(data.error)
    throw new ApiError(codes, params)
  }

  const goods = Array.isArray(data) ? data : data?.goods
  if (!Array.isArray(goods)) throw new ApiError('badFormat')

  return goods.filter(isRealItem)
}

export async function requestGoods(params) {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(params)) {
    if (value) query.set(name, value) // URLSearchParams сам экранирует #, & и прочие спецсимволы
  }
  if (DEMO_KEY) query.set('key', DEMO_KEY)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  let text
  try {
    response = await fetch(`${API_URL}?${query}`, { signal: controller.signal })
    text = await response.text()
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError('timeout', { seconds: TIMEOUT_MS / 1000 })
    }
    throw new ApiError('network', {}, { cause: error })
  } finally {
    clearTimeout(timer)
  }

  const data = parseJson(text)

  if (!response.ok && !data?.error) {
    throw new ApiError(response.status >= 500 ? 'unavailable' : 'http', { status: response.status })
  }
  if (data === undefined) throw new ApiError('notJson')

  return parseGoods(data)
}

// Этап 1: производители, выпускающие деталь с этим артикулом
export function extractBrands(goods) {
  const brands = new Map()

  for (const item of goods) {
    const id = partKey(item)
    const count = toNumber(item.count) ?? 0
    const existing = brands.get(id)

    if (existing) {
      existing.count += count
    } else {
      brands.set(id, {
        id,
        brand: item.brand ?? '',
        number: item.number ?? '',
        name: item.name ?? '',
        count,
      })
    }
  }

  // Сначала с наибольшим остатком, без товара — внизу; при равном остатке — по алфавиту
  return [...brands.values()].sort(
    (a, b) => b.count - a.count || a.brand.localeCompare(b.brand, 'ru'),
  )
}

function compareOffers(a, b) {
  if (a.isOriginal !== b.isOriginal) return a.isOriginal ? -1 : 1
  if (a.stock > 0 !== b.stock > 0) return a.stock > 0 ? -1 : 1
  if (a.price !== b.price) {
    if (a.price === null) return 1
    if (b.price === null) return -1
    return a.price - b.price
  }
  return b.stock - a.stock
}

// Этап 2: искомая деталь и её аналоги, по строке на каждое предложение склада.
// Сначала искомая деталь, затем аналоги; внутри — сперва то, что в наличии, по возрастанию цены.
export function extractOffers(goods) {
  const seen = new Set()
  const offers = []

  const addPart = (part, isOriginal) => {
    const key = partKey(part)
    if (seen.has(key)) return
    seen.add(key)

    const base = {
      partKey: key,
      brand: part.brand ?? '',
      number: part.number ?? '',
      name: part.name ?? '',
      isOriginal,
    }
    const warehouses = Array.isArray(part.warehouses) ? part.warehouses : []

    if (warehouses.length === 0) {
      offers.push({
        ...base,
        id: key,
        price: null,
        stock: toNumber(part.count) ?? 0,
        warehouse: '',
        city: '',
        shipmentDate: '',
      })
      return
    }

    warehouses.forEach((warehouse, index) => {
      offers.push({
        ...base,
        id: `${key}|${index}`,
        // Цену берём со склада: поле price у самой детали документация просит не использовать
        price: toNumber(warehouse.price),
        stock: toNumber(warehouse.stock) ?? 0,
        warehouse: warehouse.code || '',
        city: cityOf(warehouse.code),
        shipmentDate: warehouse.shipmentDate || '',
      })
    })
  }

  for (const item of goods) addPart(item, true)

  for (const item of goods) {
    const analogues = Array.isArray(item.analogues) ? item.analogues : []
    for (const analogue of analogues) {
      if (isRealItem(analogue)) addPart(analogue, false)
    }
  }

  return offers.sort(compareOffers)
}
