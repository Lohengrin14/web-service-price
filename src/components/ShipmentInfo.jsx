import { useT } from '../i18n'
import { shipmentParts } from '../utils/format'

// Дата отгрузки и время «заказ до» — время выделено часами: от него зависит, успеет ли заказ.
// Строку разбирает shipmentParts без Date: это московское время, сдвигать его нельзя.
export default function ShipmentInfo({ value }) {
  const { t, lang } = useT()
  if (!value) return null

  const parts = shipmentParts(value, lang)
  if (!parts) return <span>{value}</span>

  return (
    <span className="text-nowrap">
      {parts.date}
      {parts.time && (
        <span className="shipment-cutoff">
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 4.5V8l2.5 1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {t('shipment.cutoff', { time: parts.time })}
        </span>
      )}
    </span>
  )
}
