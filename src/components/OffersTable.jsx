import { useDispatch, useSelector } from 'react-redux'
import { fetchOffers, selectSearch } from '../store/searchSlice'
import { formatPrice, formatShipment, pluralize } from '../utils/format'
import ErrorAlert from './ErrorAlert'
import Loader from './Loader'

const COLUMNS = 4

function OfferRow({ offer }) {
  const inStock = offer.stock > 0
  const shipment = formatShipment(offer.shipmentDate)
  const warehouse = [offer.warehouse, shipment].filter(Boolean).join(' · ')

  return (
    <tr className={inStock ? undefined : 'offer-muted'}>
      <td>
        <div>
          <span className="fw-semibold">{offer.brand}</span>
          <span className="small text-body-secondary ms-2">{offer.number}</span>
        </div>
        <div>{offer.name || '—'}</div>
        {/* На узком экране склад и отгрузка показываются здесь, а не отдельной колонкой */}
        {warehouse && <div className="small text-body-secondary d-md-none">{warehouse}</div>}
      </td>
      <td className="small d-none d-md-table-cell">
        <div>{offer.warehouse || '—'}</div>
        {shipment && <div className="text-body-secondary text-nowrap">{shipment}</div>}
      </td>
      <td className="text-end text-nowrap">
        {inStock ? (
          `${offer.stock} шт.`
        ) : (
          <span className="badge text-bg-light border">нет в наличии</span>
        )}
      </td>
      <td className="text-end text-nowrap fw-semibold">{formatPrice(offer.price)}</td>
    </tr>
  )
}

function OfferGroup({ title, offers, emptyText }) {
  const parts = new Set(offers.map((offer) => offer.partKey)).size

  return (
    <tbody>
      <tr className="table-light">
        <th colSpan={COLUMNS} className="small">
          {title}
          {offers.length > 0 && (
            <span className="fw-normal text-body-secondary">
              {` · ${parts} ${pluralize(parts, ['деталь', 'детали', 'деталей'])}, `}
              {`${offers.length} ${pluralize(offers.length, ['предложение', 'предложения', 'предложений'])}`}
            </span>
          )}
        </th>
      </tr>
      {offers.length > 0 ? (
        offers.map((offer) => <OfferRow key={offer.id} offer={offer} />)
      ) : (
        <tr>
          <td colSpan={COLUMNS} className="text-body-secondary">
            {emptyText}
          </td>
        </tr>
      )}
    </tbody>
  )
}

export default function OffersTable() {
  const dispatch = useDispatch()
  const { selected, offers } = useSelector(selectSearch)

  let body
  if (!selected) {
    body = (
      <div className="card-body text-body-secondary">
        Здесь появятся цены, остатки и аналоги выбранного производителя.
      </div>
    )
  } else if (offers.status === 'loading') {
    body = (
      <div className="card-body">
        <Loader text="Загружаем предложения и аналоги…" />
      </div>
    )
  } else if (offers.status === 'failed') {
    body = (
      <div className="card-body">
        <ErrorAlert message={offers.error} onRetry={() => dispatch(fetchOffers(selected))} />
      </div>
    )
  } else if (offers.items.length === 0) {
    body = <div className="card-body text-body-secondary">Предложений по этой детали не найдено.</div>
  } else {
    const original = offers.items.filter((offer) => offer.isOriginal)
    const analogues = offers.items.filter((offer) => !offer.isOriginal)

    body = (
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Деталь</th>
              <th scope="col" className="d-none d-md-table-cell">
                Склад, отгрузка
              </th>
              <th scope="col" className="text-end">
                Остаток
              </th>
              <th scope="col" className="text-end">
                Цена
              </th>
            </tr>
          </thead>
          {original.length > 0 && <OfferGroup title="Искомая деталь" offers={original} />}
          <OfferGroup title="Аналоги" offers={analogues} emptyText="Аналогов не найдено." />
        </table>
      </div>
    )
  }

  return (
    <section className="card shadow-sm">
      <div className="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 mb-0">Предложения и аналоги</h2>
        {selected && (
          <span className="small text-body-secondary">
            {selected.brand} · {selected.number}
          </span>
        )}
      </div>
      {body}
    </section>
  )
}
