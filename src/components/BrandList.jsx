import { useDispatch, useSelector } from 'react-redux'
import { fetchBrands, fetchOffers, selectSearch } from '../store/searchSlice'
import ErrorAlert from './ErrorAlert'
import Loader from './Loader'

function StockBadge({ count }) {
  return count > 0 ? (
    <span className="badge rounded-pill text-bg-success text-nowrap">{count} шт.</span>
  ) : (
    <span className="badge rounded-pill text-bg-light border text-nowrap">нет в наличии</span>
  )
}

export default function BrandList() {
  const dispatch = useDispatch()
  const { number, selected, brands } = useSelector(selectSearch)

  let body
  if (brands.status === 'loading') {
    body = (
      <div className="card-body">
        <Loader text="Ищем производителей…" />
      </div>
    )
  } else if (brands.status === 'failed') {
    body = (
      <div className="card-body">
        <ErrorAlert message={brands.error} onRetry={() => dispatch(fetchBrands(number))} />
      </div>
    )
  } else if (brands.items.length === 0) {
    body = (
      <div className="card-body text-body-secondary">
        По артикулу <strong>{number}</strong> ничего не найдено. Проверьте номер.
      </div>
    )
  } else {
    body = (
      <div className="list-group list-group-flush brand-list">
        {brands.items.map((item) => {
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
    )
  }

  return (
    <section className="card shadow-sm">
      <div className="card-header bg-body d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">Производители</h2>
        {brands.status === 'succeeded' && (
          <span className="small text-body-secondary">{brands.items.length}</span>
        )}
      </div>
      {body}
    </section>
  )
}
