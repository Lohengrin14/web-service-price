// Одноразовый сбор стартового справочника названий: src/catalog/seed.json.
// В бандл приложения не входит.
//
// Запуск: сначала `npm run dev`, затем `node scripts/build-seed.mjs`.
// Скрипт ходит в dev-прокси, ключ API подставляет прокси — в скрипте ключа нет.
// Другой адрес прокси: SEED_API_URL=http://localhost:5179/api/search node scripts/build-seed.mjs
//
// Бережём сервис: ключ общий, а у API есть квота (по документации — на грузовой ассортимент).
// Поэтому только легковые корни, по одному запросу аналогов на корень, без перебора
// брендов и без рекурсии, всего не больше MAX_REQUESTS запросов с паузой.
// Скрипт возобновляемый: прогресс сохраняется после каждого корня, готовые корни пропускаются.

import { readFile, writeFile } from 'node:fs/promises'

const API_URL = process.env.SEED_API_URL || 'http://localhost:5173/api/search'
const OUTPUT = new URL('../src/catalog/seed.json', import.meta.url)

// Легковые корни. Если производитель известен — сразу один запрос аналогов,
// иначе сначала этап 1 (только номер) и берём производителя с наибольшим остатком.
const ROOTS = [
  { number: '01089', brand: 'FEBI' }, // антифриз
  { number: 'OC90', brand: 'MAHLE' }, // масляный фильтр
  { number: 'PB1002', brand: 'BREMBO' }, // колодки тормозные (в API PB1-002 у BREMBO — PB1002)
  { number: 'BKR6E' }, // свеча зажигания
  { number: 'CT1028' }, // ремень ГРМ
]
const MAX_REQUESTS = 10
const PAUSE_MS = 2000

let requests = 0

class StopError extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(params) {
  if (requests >= MAX_REQUESTS) throw new StopError(`достигнут лимит скрипта: ${MAX_REQUESTS} запросов`)
  if (requests > 0) await sleep(PAUSE_MS)
  requests += 1

  const response = await fetch(`${API_URL}?${new URLSearchParams(params)}`)
  const data = await response.json()

  if (data.error) {
    const text = JSON.stringify(data.error)
    if (text.includes('Request quota exceeded')) throw new StopError('API: Request quota exceeded!')
    throw new Error(`API: ${text}`)
  }
  // «Не найдено» — массив с одной пустой структурой
  return (data.goods ?? []).filter((item) => item?.brand && item?.number)
}

const clean = (text) => String(text ?? '').trim().replace(/\s+/g, ' ')
const keyOf = (entry) => `${entry.brand}|${entry.number}`.toUpperCase()
const rootId = (root) => root.number.toUpperCase()

async function readProgress() {
  try {
    const data = JSON.parse(await readFile(OUTPUT, 'utf8'))
    return { roots: data.roots ?? [], entries: data.entries ?? [] }
  } catch {
    return { roots: [], entries: [] }
  }
}

const progress = await readProgress()
const catalog = new Map(progress.entries.map((entry) => [keyOf(entry), entry]))
const doneRoots = new Set(progress.roots)

function add(part) {
  const entry = {
    name: clean(part.name),
    number: clean(part.number),
    brand: clean(part.brand),
    count: Number(part.count) || 0, // остаток на момент сбора
  }
  if (entry.name && entry.number && entry.brand) catalog.set(keyOf(entry), entry)
}

async function save() {
  const entries = [...catalog.values()].sort(
    (a, b) => a.brand.localeCompare(b.brand, 'ru') || a.number.localeCompare(b.number, 'ru'),
  )
  const lines = entries.map((entry) => `    ${JSON.stringify(entry)}`).join(',\n')
  const roots = JSON.stringify([...doneRoots])
  await writeFile(OUTPUT, `{\n  "roots": ${roots},\n  "entries": [\n${lines}\n  ]\n}\n`)
}

let stopReason = ''
try {
  for (const root of ROOTS) {
    if (doneRoots.has(rootId(root))) {
      console.log(`${root.number}: уже собран, пропускаем`)
      continue
    }

    let { number, brand } = root
    if (!brand) {
      const found = await request({ number })
      if (found.length === 0) {
        console.log(`${number}: не найден, пропускаем`)
        doneRoots.add(rootId(root))
        await save()
        continue
      }
      const stockOf = (item) => Number(item.count) || 0
      const top = found.reduce((best, item) => (stockOf(item) > stockOf(best) ? item : best))
      ;({ number, brand } = top)
    }

    for (const part of await request({ number, brand, analogues: 'on' })) {
      add(part)
      for (const analogue of part.analogues ?? []) add(analogue)
    }
    doneRoots.add(rootId(root))
    await save()
    console.log(`${root.number} → ${brand} ${number}: в справочнике ${catalog.size}`)
  }
} catch (error) {
  if (!(error instanceof StopError)) throw error
  stopReason = error.message
}

await save()
console.log(
  `Готово: ${catalog.size} записей, ${requests} запросов` +
    (stopReason ? `. Остановлено: ${stopReason}. Перезапустите позже — продолжит с места остановки.` : '.'),
)
