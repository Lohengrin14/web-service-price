import { useT } from '../i18n'
import { formatPriceRound } from '../utils/format'

// Ползунок цены с двумя бегунками поверх шкалы scale = { min, max, step }.
// Два нативных input[type=range] друг на друге: работают мышью, пальцем и с клавиатуры.
// Бегунок на краю шкалы — «без ограничения» (пустая строка), иначе — число строкой,
// как в остальных фильтрах.
export default function PriceRange({ scale, minPrice, maxPrice, onMinChange, onMaxChange }) {
  const { t, lang } = useT()
  const { min, max, step } = scale

  const clamp = (value, fallback) => {
    const number = value === '' ? fallback : Number(value)
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
  }
  const low = clamp(minPrice, min)
  const high = clamp(maxPrice, max)
  const percent = (value) => ((value - min) / (max - min)) * 100

  const changeLow = (event) => {
    const value = Math.min(Number(event.target.value), high - step)
    onMinChange(value <= min ? '' : String(value))
  }
  const changeHigh = (event) => {
    const value = Math.max(Number(event.target.value), low + step)
    onMaxChange(value >= max ? '' : String(value))
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-baseline mb-1">
        <span className="form-label small mb-0">{t('filters.price')}</span>
        <span className="small fw-semibold num">
          {t('filters.priceRange', { from: formatPriceRound(low, lang), to: formatPriceRound(high, lang) })}
        </span>
      </div>
      <div
        className="price-range"
        style={{ '--range-from': `${percent(low)}%`, '--range-to': `${percent(high)}%` }}
      >
        <div className="price-range-track" aria-hidden="true" />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={changeLow}
          aria-label={t('filters.priceMin')}
          aria-valuetext={formatPriceRound(low, lang)}
          // Оба бегунка у правого края — нижний должен оставаться доступным для захвата
          style={{ zIndex: low > max - (max - min) / 10 ? 3 : 2 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={changeHigh}
          aria-label={t('filters.priceMax')}
          aria-valuetext={formatPriceRound(high, lang)}
        />
      </div>
      <div className="d-flex justify-content-between small text-body-secondary num">
        <span>{formatPriceRound(min, lang)}</span>
        <span>{formatPriceRound(max, lang)}</span>
      </div>
    </div>
  )
}
