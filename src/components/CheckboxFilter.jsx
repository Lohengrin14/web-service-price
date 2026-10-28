import { useState } from 'react'
import { useT } from '../i18n'

// Выпадающий список с галочками: поиск, «Выбрать всех» и остаток у каждого варианта.
// options — [{ value, stock }], checked — отмеченные значения; никто не отмечен — значит все.
// emptyLabel — подпись для пустого значения, если такое попадёт в список.
export default function CheckboxFilter({
  id,
  title,
  searchPlaceholder,
  emptyLabel = '—',
  options,
  checked,
  onToggle,
  onSetAll,
}) {
  const { t } = useT()
  // Поиск только сужает список галочек, сами фильтры он не меняет
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const matching = normalizedQuery
    ? options.filter(({ value }) => (value || emptyLabel).toLowerCase().includes(normalizedQuery))
    : options

  const allChecked = checked.length === options.length
  const summary =
    checked.length > 0 && !allChecked
      ? t('checkbox.some', { checked: checked.length, total: options.length })
      : t('checkbox.all', { total: options.length })

  return (
    <details className="mt-2">
      <summary className="small">
        {title}: {summary}
      </summary>
      <div className="d-flex align-items-center gap-3 mt-2">
        <input
          type="search"
          className="form-control form-control-sm"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {/* Включить — отметить всех, выключить — снять все отметки и выбрать заново */}
        <div className="form-check form-switch mb-0 flex-shrink-0">
          <input
            id={`${id}-all`}
            type="checkbox"
            role="switch"
            className="form-check-input"
            checked={allChecked}
            onChange={(event) => onSetAll(event.target.checked ? options.map(({ value }) => value) : [])}
          />
          <label htmlFor={`${id}-all`} className="form-check-label small text-nowrap">
            {t('checkbox.selectAll')}
          </label>
        </div>
      </div>
      <div className="checkbox-filter-options pt-2">
        {matching.map(({ value, stock }, index) => (
          <div key={value} className="form-check d-flex justify-content-between gap-3">
            <span>
              <input
                id={`${id}-${index}`}
                type="checkbox"
                className="form-check-input"
                checked={checked.includes(value)}
                onChange={() => onToggle(value)}
              />
              <label htmlFor={`${id}-${index}`} className="form-check-label small">
                {value || emptyLabel}
              </label>
            </span>
            {/* У пустого значения подпись уже всё объясняет, остаток не дублируем */}
            {value && (
              <span className="small text-body-secondary text-nowrap">
                {stock > 0 ? t('common.pcs', { count: stock }) : t('common.outOfStock')}
              </span>
            )}
          </div>
        ))}
        {matching.length === 0 && (
          <div className="small text-body-secondary">{t('common.nothingFound')}</div>
        )}
      </div>
    </details>
  )
}
