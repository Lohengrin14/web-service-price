import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { resetFilters, selectFilters, selectVisibleOffers, setSort } from '../store/filtersSlice'
import { fetchOffers, selectSearch } from '../store/searchSlice'
import { formatPrice, formatShipment, pluralize } from '../utils/format'
import ErrorAlert from './ErrorAlert'
import Loader from './Loader'
import OfferFilters from './OfferFilters'

const COLUMNS = 4
// Большие выдачи (у OC90 больше 3 тыс. предложений) показываем порциями
const PAGE_SIZE = 50
// Сколько аналогов должно быть подгружено, чтобы появилась кнопка «Наверх»
const SCROLL_TOP_AFTER = 100

// Порядок сортировки по клику на заголовок: первый клик — первый вариант, повторный — второй.
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
  const index = orders.findIndex(([value]) => value === sort)
  const active = orders[index]
  const next = orders[index === 0 ? 1 : 0][0]

  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? (active[1] ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        className="btn btn-link p-0 border-0 fw-bold text-reset text-decoration-none text-nowrap"
        onClick={() => dispatch(setSort(next))}
      >
        {label}
        {active && (active[1] ? ' ↑' : ' ↓')}
      </button>
    </th>
  )
}

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

// Метка под таблицей: когда пользователь доскроллил до неё, подгружаем следующую порцию.
// shown в зависимостях — после подгрузки пересоздаём наблюдатель: если метка всё ещё
// на экране (высокий экран), он сразу сработает снова.
function LoadMore({ shown, total, onLoad }) {
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoad()
      },
      { rootMargin: '300px' },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [shown, onLoad])

  return (
    <div ref={ref} className="card-footer bg-body small text-body-secondary text-center">
      Показано аналогов: {shown} из {total}. Прокрутите ниже, чтобы увидеть ещё.
    </div>
  )
}

// offers — вся группа (для счётчиков), rows — строки, которые видны на текущей странице
function OfferGroup({ title, offers, rows = offers, emptyText }) {
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
  } else if (visible.length === 0) {
    body = (
      <>
        <OfferFilters />
        <div className="card-body text-body-secondary">
          Под выбранные фильтры ничего не подошло.{' '}
          <button
            type="button"
            className="btn btn-link p-0 align-baseline"
            onClick={() => dispatch(resetFilters())}
          >
            Сбросить фильтры
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
                <th scope="col">Деталь</th>
                <SortHeader
                  label="Склад, отгрузка"
                  orders={SHIPMENT_ORDERS}
                  className="d-none d-md-table-cell"
                />
                <SortHeader label="Остаток" orders={STOCK_ORDERS} className="text-end" />
                <SortHeader label="Цена" orders={PRICE_ORDERS} className="text-end" />
              </tr>
            </thead>
            {/* Искомую деталь фильтры тоже скрывают, но секция остаётся, чтобы это было видно */}
            {hasOriginal && (
              <OfferGroup title="Искомая деталь" offers={original} emptyText="Скрыта фильтрами." />
            )}
            <OfferGroup
              title="Аналоги"
              offers={analogues}
              rows={analogueRows}
              emptyText={hasAnalogues ? 'Под фильтры не подошёл ни один аналог.' : 'Аналогов не найдено.'}
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
            ↑ Наверх
          </button>
        )}
        {rest > 0 && (
          <LoadMore shown={analogueRows.length} total={analogues.length} onLoad={showMore} />
        )}
      </>
    )
  }

  return (
    <section ref={sectionRef} className="card shadow-sm offers-card">
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
