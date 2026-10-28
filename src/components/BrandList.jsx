import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useT } from '../i18n'
import { fetchBrands, fetchOffers, selectSearch } from '../store/searchSlice'
import CopyNumber from './CopyNumber'
import ErrorAlert from './ErrorAlert'
import Skeleton from './Skeleton'
import StockPill from './StockPill'

export default function BrandList() {
  const dispatch = useDispatch()
  const { t } = useT()
  const { number, fromName, selected, brands } = useSelector(selectSearch)
  const [query, setQuery] = useState('')
  const listRef = useRef(null)
  const normalizedQuery = query.trim().toLowerCase()
  const matchingBrands = normalizedQuery
    ? brands.items.filter((item) => item.brand.toLowerCase().includes(normalizedQuery))
    : brands.items

  // Клавиатура: стрелки и Home/End двигают фокус по производителям, Enter и пробел — выбор
  // (обычное поведение кнопки). В список Tab заходит один раз — на выбранного производителя.
  const handleKeyDown = (event) => {
    const moves = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity }
    if (!(event.key in moves)) return

    const buttons = [...listRef.current.querySelectorAll('.brand-select')]
    const current = buttons.indexOf(document.activeElement)
    if (current === -1) return

    event.preventDefault()
    const next = Math.min(buttons.length - 1, Math.max(0, current + moves[event.key]))
    buttons[next].focus()
  }

  const activeIndex = matchingBrands.findIndex(
    (item) => selected?.brand === item.brand && selected?.number === item.number,
  )

  let body
  if (brands.status === 'loading') {
    body = (
      <Skeleton text={t('brands.loading')} rows={4} />
    )
  } else if (brands.status === 'failed') {
    body = (
      <div className="card-body">
        <ErrorAlert error={brands.error} onRetry={() => dispatch(fetchBrands({ number }))} />
      </div>
    )
  } else if (brands.items.length === 0 && fromName) {
    body = (
      <div className="card-body text-body-secondary">{t('names.empty')}</div>
    )
  } else if (brands.items.length === 0) {
    body = (
      <div className="card-body text-body-secondary">{t('brands.notFound', { number })}</div>
    )
  } else {
    body = (
      <>
        <div className="card-body border-bottom py-2">
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder={t('brands.search')}
            aria-label={t('brands.searchLabel')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {matchingBrands.length === 0 && (
          <div className="card-body small text-body-secondary">{t('common.nothingFound')}</div>
        )}
        <div
          ref={listRef}
          className="list-group list-group-flush brand-list"
          role="group"
          aria-label={t('brands.title')}
          onKeyDown={handleKeyDown}
        >
          {matchingBrands.map((item, index) => {
            const isActive = index === activeIndex
            const isTabbable = activeIndex >= 0 ? isActive : index === 0
            return (
              <div key={item.id} className={`list-group-item brand-item${isActive ? ' active' : ''}`}>
                <button
                  type="button"
                  className="brand-select"
                  aria-pressed={isActive}
                  tabIndex={isTabbable ? 0 : -1}
                  onClick={() => dispatch(fetchOffers({ number: item.number, brand: item.brand }))}
                >
                  <span>
                    <span className="d-block fw-semibold">{item.brand}</span>
                    <span className="d-block small text-body-secondary">
                      <span className="part-number">{item.number}</span>
                      {item.name && ` · ${item.name}`}
                    </span>
                  </span>
                  <StockPill count={item.count} />
                </button>
                {/* Копирование — мышью; с клавиатуры артикул выбранного копируется в заголовке
                    карточки предложений, а здесь лишние остановки Tab не нужны */}
                <CopyNumber number={item.number} variant="icon" tabIndex={-1} />
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <section className="card">
      <div className="card-header bg-body d-flex justify-content-between align-items-center">
        <h2 className="section-title mb-0">{t('brands.title')}</h2>
        {brands.status === 'succeeded' && (
          <span className="small text-body-secondary">{brands.items.length}</span>
        )}
      </div>
      {body}
    </section>
  )
}
