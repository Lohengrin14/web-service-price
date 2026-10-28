import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useT } from '../i18n'
import { fetchBrands, fetchOffers, selectSearch } from '../store/searchSlice'
import ErrorAlert from './ErrorAlert'
import Loader from './Loader'

function StockBadge({ count }) {
  const { t } = useT()
  return count > 0 ? (
    <span className="badge rounded-pill text-bg-success text-nowrap">{t('common.pcs', { count })}</span>
  ) : (
    <span className="badge rounded-pill text-bg-light border text-nowrap">{t('common.outOfStock')}</span>
  )
}

export default function BrandList() {
  const dispatch = useDispatch()
  const { t } = useT()
  const { number, fromName, selected, brands } = useSelector(selectSearch)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const matchingBrands = normalizedQuery
    ? brands.items.filter((item) => item.brand.toLowerCase().includes(normalizedQuery))
    : brands.items

  let body
  if (brands.status === 'loading') {
    body = (
      <div className="card-body">
        <Loader text={t('brands.loading')} />
      </div>
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
        <div className="list-group list-group-flush brand-list">
          {matchingBrands.map((item) => {
            const isActive = selected?.brand === item.brand && selected?.number === item.number
            return (
              <button
                key={item.id}
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start gap-3${isActive ? ' active' : ''}`}
                aria-pressed={isActive}
                onClick={() => dispatch(fetchOffers({ number: item.number, brand: item.brand }))}
              >
                <span>
                  <span className="d-block fw-semibold">{item.brand}</span>
                  <span className="d-block small opacity-75">
                    {item.number}
                    {item.name && ` · ${item.name}`}
                  </span>
                </span>
                <StockBadge count={item.count} />
              </button>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <section className="card shadow-sm">
      <div className="card-header bg-body d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('brands.title')}</h2>
        {brands.status === 'succeeded' && (
          <span className="small text-body-secondary">{brands.items.length}</span>
        )}
      </div>
      {body}
    </section>
  )
}
