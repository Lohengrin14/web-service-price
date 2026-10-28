// Справочник названий деталей для поиска по названию.
// У API нет поиска по названию, поэтому ищем по своему справочнику:
// seed.json (собран скриптом scripts/build-seed.mjs) + всё, что приходило в ответах API
// у этого пользователя (localStorage). Это поиск артикула по справочнику, а не подбор по авто.

const STORAGE_KEY = 'parts-search:catalog'
const STORAGE_VERSION = 1
export const MAX_LEARNED = 5000

// Запись справочника: { name, number, brand, count }
const keyOf = (entry) => `${entry.brand}|${entry.number}`.toUpperCase()

// «Ёлка  Фильтр » → «елка фильтр». Ё и Е, Ъ и Ь не различаем: их часто путают или
// пишут без ё — «стеклоподьемник» должен найти «Стеклоподъёмник».
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/ъ/g, 'ь')
    .trim()
    .replace(/\s+/g, ' ')
}

const tokenize = (text) => normalizeText(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean)

// Каждое слово запроса — начало какого-то слова названия или производителя, порядок слов
// не важен: «фильтр масл» находит «Масляный фильтр», «колодки brembo» — колодки BREMBO
export function findInCatalog(entries, query) {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  // Слова ищем и в названии, и в производителе: «bosch», «колодки brembo»
  return entries.filter((entry) => {
    const words = [...tokenize(entry.name), ...tokenize(entry.brand)]
    return queryTokens.every((token) => words.some((word) => word.startsWith(token)))
  })
}

// Сливает записи: дубли по паре бренд+артикул, новые заменяют старые и встают в конец.
// Если записей больше limit — вытесняем самые старые (из начала списка).
export function mergeEntries(existing, incoming, limit = Infinity) {
  const merged = new Map(existing.map((entry) => [keyOf(entry), entry]))
  for (const entry of incoming) {
    const key = keyOf(entry)
    merged.delete(key)
    merged.set(key, entry)
  }

  const entries = [...merged.values()]
  return entries.length > limit ? entries.slice(entries.length - limit) : entries
}

// localStorage может быть недоступен (приватный режим, запрет cookies) — тогда живём без него
export function readLearned() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return data?.version === STORAGE_VERSION && Array.isArray(data.entries) ? data.entries : []
  } catch {
    return []
  }
}

function writeLearned(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, entries }))
    return true
  } catch {
    return false
  }
}

// Запоминает детали из ответов API. Не влезло в хранилище — пробуем вдвое меньше.
export function learn(incoming) {
  const fresh = incoming.filter((entry) => entry.name && entry.number && entry.brand)
  if (fresh.length === 0) return

  let entries = mergeEntries(readLearned(), fresh, MAX_LEARNED)
  while (entries.length > 0 && !writeLearned(entries)) {
    entries = entries.slice(Math.ceil(entries.length / 2))
  }
}

// seed грузим отдельным чанком при первом поиске по названию, а не в основном бандле
let seedPromise = null
const loadSeed = () => {
  seedPromise ??= import('./seed.json').then((module) => module.default.entries)
  return seedPromise
}

export async function searchCatalog(query) {
  const seed = await loadSeed()
  return findInCatalog(mergeEntries(seed, readLearned()), query)
}
