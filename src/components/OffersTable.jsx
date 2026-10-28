import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useT } from '../i18n'
import { resetFilters, selectFilters, selectVisibleOffers, setSort } from '../store/filtersSlice'
import { fetchOffers, selectSearch } from '../store/searchSlice'
import { formatPrice, formatShipment } from '../utils/format'
import ErrorAlert from './ErrorAlert'
import LoadMore from './LoadMore'
import Loader from './Loader'
import OfferFilters from './OfferFilters'
import SortButton from './SortButton'

const COLUMNS = 4
// Большие выдачи (у OC90 больше 3 тыс. предложений) показываем порциями
const PAGE_SIZE = 50
// Сколько аналогов должно быть подгружено, чтобы появилась кнопка «Наверх»
const SCROLL_TOP_AFTER = 100

// Порядок сортировки по клику на заголовок (см. SortButton).
// Второе значение — по возрастанию ли (для стрелки и aria-sort).
const PRICE_ORDERS = [
  ['price-asc', true],
  ['price-desc', false],
]
const SHIPMENT_ORDERS = [
  ['shipment-asc', true],
  ['shipment-desc', false],
]
const STOCK_ORDERS = [
  ['stock-desc', false],
  ['stock-asc', true],
]

function SortHeader({ label, orders, className }) {
  const dispatch = useDispatch()
  const { sort } = useSelector(selectFilters)
  const active = orders.find(([value]) => value === sort)

  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? (active[1] ? 'ascending' : 'descending') : undefined}
    >
      <SortButton
        label={label}
        orders={orders}
        sort={sort}
        onSort={(value) => dispatch(setSort(value))}
      />
    </th>
  )
}

function OfferRow({ offer }) {
  const { t, lang } = useT()
  const inStock = offer.stock > 0
  const shipment = formatShipment(offer.shipmentDate, lang)
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
          t('common.pcs', { count: offer.stock })
        ) : (
          <span className="badge text-bg-light border">{t('common.outOfStock')}</span>
        )}
      </td>
      <td className="text-end text-nowrap fw-semibold">{formatPrice(offer.price, lang)}</td>
    </tr>
  )
}

// offers — вся группа (для счётчиков), rows — строки, которые видны на текущей странице
function OfferGroup({ title, offers, rows = offers, emptyText }) {
  const { t } = useT()
  const parts = new Set(offers.map((offer) => offer.partKey)).size

  return (
    <tbody>
      <tr className="table-light">
        <th colSpan={COLUMNS} className="small">
          {title}
          {offers.length > 0 && (
            <span className="fw-normal text-body-secondary">
              {` · ${t('offers.parts', { count: parts })}, ${t('offers.count', { count: offers.length })}`}
            </span>
          )}
        </th>
      </tr>
      {offers.length > 0 ? (
        rows.map((offer) => <OfferRow key={offer.id} offer={offer} />)
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
  const { t } = useT()
  const { selected, offers } = useSelector(selectSearch)
  const visible = useSelector(selectVisibleOffers)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [limitFor, setLimitFor] = useState(visible)

  const showMore = useCallback(() => setLimit((current) => current + PAGE_SIZE), [])
  const sectionRef = useRef(null)
  const [isFarBelow, setIsFarBelow] = useState(false)

  // Ушли от начала карточки дальше, чем на экран вниз — пора показывать «Наверх»
  useEffect(() => {
    const handleScroll = () =>
      setIsFarBelow(sectionRef.current.getBoundingClientRect().top < -window.innerHeight)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Новая выдача, фильтры или сортировка — снова показываем с первой порции
  if (visible !== limitFor) {
    setLimitFor(visible)
    setLimit(PAGE_SIZE)
  }

  let body
  if (!selected) {
    body = (
      <div className="card-body text-body-secondary">{t('offers.placeholder')}</div>
    )
  } else if (offers.status === 'loading') {
    body = (
      <div className="card-body">
        <Loader text={t('offers.loading')} />
      </div>
    )
  } else if (offers.status === 'failed') {
    body = (
      <div className="card-body">
        <ErrorAlert error={offers.error} onRetry={() => dispatch(fetchOffers(selected))} />
      </div>
    )
  } else if (offers.items.length === 0) {
    body = <div className="card-body text-body-secondary">{t('offers.empty')}</div>
  } else if (visible.length === 0) {
    body = (
      <>
        <OfferFilters />
        <div className="card-body text-body-secondary">
          {t('common.noFilterMatch')}{' '}
          <button
            type="button"
            className="btn btn-link p-0 align-baseline"
            onClick={() => dispatch(resetFilters())}
          >
            {t('common.resetFilters')}
          </button>
        </div>
      </>
    )
  } else {
    // Фильтры и сортировка уже применены ко всей выдаче, обрезаем под страницу в последнюю очередь.
    // Искомая деталь видна всегда целиком, порциями показываем только аналоги.
    const original = visible.filter((offer) => offer.isOriginal)
    const analogues = visible.filter((offer) => !offer.isOriginal)
    const analogueRows = analogues.slice(0, limit)
    const rest = analogues.length - analogueRows.length
    const hasOriginal = offers.items.some((offer) => offer.isOriginal)
    const hasAnalogues = offers.items.some((offer) => !offer.isOriginal)

    body = (
      <>
        <OfferFilters />
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">{t('offers.colPart')}</th>
                <SortHeader
                  label={t('offers.colWarehouse')}
                  orders={SHIPMENT_ORDERS}
                  className="d-none d-md-table-cell"
                />
                <SortHeader label={t('offers.colStock')} orders={STOCK_ORDERS} className="text-end" />
                <SortHeader label={t('offers.colPrice')} orders={PRICE_ORDERS} className="text-end" />
              </tr>
            </thead>
            {/* Искомую деталь фильтры тоже скрывают, но секция остаётся, чтобы это было видно */}
            {hasOriginal && (
              <OfferGroup
                title={t('offers.original')}
                offers={original}
                emptyText={t('offers.hiddenByFilters')}
              />
            )}
            <OfferGroup
              title={t('offers.analogues')}
              offers={analogues}
              rows={analogueRows}
              emptyText={t(hasAnalogues ? 'offers.noAnalogueMatch' : 'offers.noAnalogues')}
            />
          </table>
        </div>
        {/* Длинный список — даём быстро вернуться к фильтрам, не прокручивая всё назад */}
        {isFarBelow && analogueRows.length >= SCROLL_TOP_AFTER && (
          <button
            type="button"
            className="btn btn-primary rounded-pill shadow position-fixed bottom-0 end-0 m-3"
            style={{ zIndex: 1030 }}
            onClick={() => sectionRef.current.scrollIntoView({ behavior: 'smooth' })}
          >
            {t('common.toTop')}
          </button>
        )}
        {rest > 0 && (
          <LoadMore
            text={t('offers.loadMore', { shown: analogueRows.length, total: analogues.length })}
            shown={analogueRows.length}
            onLoad={showMore}
          />
        )}
      </>
    )
  }

  return (
    <section ref={sectionRef} className="card shadow-sm offers-card">
      <div className="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 mb-0">{t('offers.title')}</h2>
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
