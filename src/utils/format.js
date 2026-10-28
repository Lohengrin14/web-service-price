import { localeOf, translate } from '../i18n'

// Цена всегда в рублях; narrowSymbol — чтобы и в английской версии был «₽», а не «RUB»
export function formatPrice(price, lang = 'ru') {
  if (price === null) return '—'
  return new Intl.NumberFormat(localeOf(lang), {
    style: 'currency',
    currency: 'RUB',
    currencyDisplay: 'narrowSymbol',
  }).format(price)
}

// Цена без копеек — для подписей шкалы: «2 500 ₽», «₽2,500»
export function formatPriceRound(price, lang = 'ru') {
  return new Intl.NumberFormat(localeOf(lang), {
    style: 'currency',
    currency: 'RUB',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(price)
}

// shipmentDate — дата отгрузки и время, до которого нужно сделать заказ.
// Понимает ISO (2026-10-28T14:00:00) и формат 1С (28.10.2026 14:00:00).
function parseShipment(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(value)
  if (iso) {
    const [, year, month, day, hours, minutes] = iso
    return { year, month, day, hours, minutes }
  }

  const ru = /^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/.exec(value)
  if (ru) {
    const [, day, month, year, hours, minutes] = ru
    return { year, month, day, hours, minutes }
  }

  return null
}

// Как показывать дату отгрузки: «29.10» или «Oct 29». Год не нужен — отгрузка в ближайшие дни.
const DATE_OPTIONS = {
  ru: { day: '2-digit', month: '2-digit' },
  en: { month: 'short', day: 'numeric' },
}

// Время в shipmentDate — московское «заказать до», его показываем как есть.
// Через new Date(value) браузер сдвинул бы его на свой часовой пояс, поэтому дату
// собираем из чисел в UTC и форматируем тоже в UTC — сдвига нет.
// Возвращает { date: '02.11', time: '13:30' } (time пустой, если 00:00 или не указан);
// null — если строку не разобрать.
export function shipmentParts(value, lang = 'ru') {
  const parts = value ? parseShipment(value) : null
  if (!parts) return null

  const { year, month, day, hours, minutes } = parts
  const date = new Intl.DateTimeFormat(localeOf(lang), {
    ...(DATE_OPTIONS[lang] ?? DATE_OPTIONS.ru),
    timeZone: 'UTC',
  }).format(Date.UTC(year, month - 1, day))
  const hasTime = hours !== undefined && !(Number(hours) === 0 && Number(minutes) === 0)

  return { date, time: hasTime ? `${hours.padStart(2, '0')}:${minutes}` : '' }
}

// То же одной строкой: «02.11, заказ до 13:30»; незнакомый формат — как есть
export function formatShipment(value, lang = 'ru') {
  if (!value) return ''

  const parts = shipmentParts(value, lang)
  if (!parts) return value

  const { date, time } = parts
  return time ? translate(lang, 'shipment.orderBy', { date, time }) : date
}

// Дата отгрузки числом — для сортировки; null, если дату не разобрать
export function shipmentTime(value) {
  const parts = value ? parseShipment(value) : null
  if (!parts) return null

  const { year, month, day, hours = 0, minutes = 0 } = parts
  return Date.UTC(year, month - 1, day, hours, minutes)
}

// Артикулы вводят как попало: «ОС 90 », «oc90». Приводим к одному виду,
// чтобы один и тот же артикул не искался дважды и ссылка была чистой.
export function normalizeNumber(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
}

// Ключ для сравнения артикулов: «OC 90», «OC-90» и «oc90» — один и тот же артикул,
// API для них возвращает одно и то же. Только для дедупа запросов: в API, URL и поле
// ввода уходит читаемый вид из normalizeNumber. Кириллицу тоже оставляем.
export function canonicalNumber(value) {
  return String(value ?? '').replace(/[^\p{L}\p{N}]/gu, '').toUpperCase()
}

// Режим поиска: есть цифры — это артикул (в том числе «ОС90» кириллицей — API его понимает),
// нет цифр — ищем по справочнику названий. «Название + цифры» («колодки 2109») уходит в артикул.
export function detectMode(text) {
  return /\d/.test(text) ? 'article' : 'name'
}
