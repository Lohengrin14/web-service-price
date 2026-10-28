const priceFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })

export function formatPrice(price) {
  return price === null ? '—' : priceFormat.format(price)
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

// Год не показываем: отгрузка всегда в ближайшие дни
export function formatShipment(value) {
  if (!value) return ''

  const parts = parseShipment(value)
  if (!parts) return value

  const { day, month, hours, minutes } = parts
  const date = `${day}.${month}`
  const hasTime = hours !== undefined && !(Number(hours) === 0 && Number(minutes) === 0)

  return hasTime ? `${date}, заказ до ${hours.padStart(2, '0')}:${minutes}` : date
}

// Дата отгрузки числом — для сортировки; null, если дату не разобрать
export function shipmentTime(value) {
  const parts = value ? parseShipment(value) : null
  if (!parts) return null

  const { year, month, day, hours = 0, minutes = 0 } = parts
  return Date.UTC(year, month - 1, day, hours, minutes)
}

// pluralize(5, ['деталь', 'детали', 'деталей']) → 'деталей'
export function pluralize(count, [one, few, many]) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
