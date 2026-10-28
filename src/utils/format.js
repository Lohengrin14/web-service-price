const priceFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })

export function formatPrice(price) {
  return price === null ? '—' : priceFormat.format(price)
}

// shipmentDate — дата отгрузки и время, до которого нужно сделать заказ.
// Понимает ISO (2026-10-28T14:00:00) и формат 1С (28.10.2026 14:00:00).
// Год не показываем: отгрузка всегда в ближайшие дни.
export function formatShipment(value) {
  if (!value) return ''

  const iso = /^\d{4}-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(value)
  const ru = /^(\d{2})\.(\d{2})\.\d{4}(?:[ T](\d{1,2}):(\d{2}))?/.exec(value)

  let day, month, hours, minutes
  if (iso) [, month, day, hours, minutes] = iso
  else if (ru) [, day, month, hours, minutes] = ru
  else return value

  const date = `${day}.${month}`
  const hasTime = hours !== undefined && !(Number(hours) === 0 && Number(minutes) === 0)

  return hasTime ? `${date}, заказ до ${hours.padStart(2, '0')}:${minutes}` : date
}

// pluralize(5, ['деталь', 'детали', 'деталей']) → 'деталей'
export function pluralize(count, [one, few, many]) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
