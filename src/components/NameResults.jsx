import { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useT } from '../i18n'
import { summarizeStock } from '../store/filtersSlice'
import { fetchBrands, searchByName, selectSearch } from '../store/searchSlice'
import CheckboxFilter from './CheckboxFilter'
import ErrorAlert from './ErrorAlert'
import LoadMore from './LoadMore'
import Loader from './Loader'
import SortButton from './SortButton'

const PAGE_SIZE = 50

const byBrand = (a, b) => a.brand.localeCompare(b.brand, 'ru') || a.number.localeCompare(b.number, 'ru')
const SORTERS = {
  'brand-asc': byBrand,
  'brand-desc': (a, b) => byBrand(b, a),
  'count-desc': (a, b) => b.count - a.count || byBrand(a, b),
  'count-asc': (a, b) => a.count - b.count || byBrand(a, b),
}

// Порядок по клику на заголовок (см. SortButton)
const BRAND_ORDERS = [
  ['brand-asc', true],
  ['brand-desc', false],
]
const COUNT_ORDERS = [
  ['count-desc', false],
  ['count-asc', true],
]

const toggle = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

// Результаты поиска по названию: детали из справочника. Клик по строке запускает
// обычный поиск по артикулу с этим производителем — дальше этапы 1 и 2 как всегда.
export default function NameResults() {
  const dispatch = useDispatch()
  const { t } = useT()
  const { query, names } = useSelector(selectSearch)
  // Фильтры живут только на этом экране; при новом поиске компонент создаётся заново (key в App)
  const [checkedBrands, setCheckedBrands] = useState([])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState('brand-asc') // по умолчанию — по производителю, А→Я
  const [limit, setLimit] = useState(PAGE_SIZE)
  const showMore = useCallback(() => setLimit((current) => current + PAGE_SIZE), [])

  const brandOptions = useMemo(() => summarizeStock(names.items, 'brand', 'count'), [names.items])
  // Фильтруем и сортируем весь список, на страницу обрезаем в последнюю очередь
  const visible = useMemo(
    () =>
      names.items
        .filter(
          (item) =>
            (!inStockOnly || item.count > 0) &&
            (checkedBrands.length === 0 || checkedBrands.includes(item.brand)),
        )
        .sort(SORTERS[sort]),
    [names.items, inStockOnly, checkedBrands, sort],
  )

  // Любая смена фильтров — снова с первой порции
  const changeFilters = (apply) => {
    apply()
    setLimit(PAGE_SIZE)
  }
  const resetFilters = () =>
    changeFilters(() => {
      setCheckedBrands([])
      setInStockOnly(false)
    })

  let body
  if (names.status === 'loading') {
    body = (
      <div className="card-body">
        <Loader text={t('names.loading')} />
      </div>
    )
  } else if (names.status === 'failed') {
    body = (
      <div className="card-body">
        <ErrorAlert error={names.error} onRetry={() => dispatch(searchByName(query))} />
      </div>
    )
  } else if (names.items.length === 0) {
    body = (
      <div className="card-body text-body-secondary">{t('names.empty')}</div>
    )
  } else {
    const rows = visible.slice(0, limit)
    const hasFilters = inStockOnly || checkedBrands.length > 0

    body = (
      <>
        <div className="card-body border-bottom">
          <p className="small text-body-secondary mb-0">{t('names.incomplete')}</p>
          {brandOptions.length > 1 && (
            <CheckboxFilter
              id="name-brands"
              title={t('brands.title')}
              searchPlaceholder={t('filters.findBrand')}
              options={brandOptions}
              checked={checkedBrands}
              onToggle={(value) => changeFilters(() => setCheckedBrands((checked) => toggle(checked, value)))}
              onSetAll={(values) => changeFilters(() => setCheckedBrands(values))}
            />
          )}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
            <div className="form-check form-switch mb-0">
              <input
                id="name-in-stock-only"
                type="checkbox"
                role="switch"
                className="form-check-input"
                checked={inStockOnly}
                onChange={(event) => changeFilters(() => setInStockOnly(event.target.checked))}
              />
              <label htmlFor="name-in-stock-only" className="form-check-label small">
                {t('common.inStockOnly')}
              </label>
            </div>
            <div className="small text-body-secondary">
              {t('names.matching', { shown: visible.length, count: names.items.length })}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-2 align-baseline"
                disabled={!hasFilters}
                onClick={resetFilters}
              >
                {t('common.resetFilters')}
              </button>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="card-body text-body-secondary">
            {t('common.noFilterMatch')}{' '}
            <button type="button" className="btn btn-link p-0 align-baseline" onClick={resetFilters}>
              {t('common.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            <div className="list-group-item d-flex justify-content-between gap-3 bg-body-tertiary">
              <SortButton
                label={t('names.colBrand')}
                orders={BRAND_ORDERS}
                sort={sort}
                onSort={(value) => changeFilters(() => setSort(value))}
              />
              <SortButton
                label={t('names.colCount')}
                orders={COUNT_ORDERS}
                sort={sort}
                onSort={(value) => changeFilters(() => setSort(value))}
              />
            </div>
            {rows.map((item) => (
              <button
                key={`${item.brand}|${item.number}`}
                type="button"
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-start gap-3"
                onClick={() => dispatch(fetchBrands({ number: item.number, brand: item.brand }))}
              >
                <span>
                  <span className="fw-semibold">{item.brand}</span>
                  <span className="small text-body-secondary ms-2">{item.number}</span>
                  <span className="d-block">{item.name}</span>
                </span>
                <span
                  className={`badge rounded-pill text-nowrap ${item.count > 0 ? 'text-bg-success' : 'text-bg-light border'}`}
                >
                  {item.count > 0 ? t('common.pcs', { count: item.count }) : t('common.outOfStock')}
                </span>
              </button>
            ))}
          </div>
        )}

        {rows.length < visible.length && (
          <LoadMore
            text={t('names.loadMore', { shown: rows.length, total: visible.length })}
            shown={rows.length}
            onLoad={showMore}
          />
        )}
        <div className="card-footer bg-body small text-body-secondary">{t('names.stockNote')}</div>
      </>
    )
  }

  return (
    <section className="card shadow-sm">
      <div className="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 mb-0">{t('names.title')}</h2>
        <span className="small text-body-secondary">«{query}»</span>
      </div>
      {body}
    </section>
  )
}
