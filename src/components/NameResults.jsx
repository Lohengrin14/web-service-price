import { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { summarizeStock } from '../store/filtersSlice'
import { fetchBrands, searchByName, selectSearch } from '../store/searchSlice'
import { pluralize } from '../utils/format'
import CheckboxFilter from './CheckboxFilter'
import ErrorAlert from './ErrorAlert'
import LoadMore from './LoadMore'
import Loader from './Loader'

const PAGE_SIZE = 50

const toggle = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

// Результаты поиска по названию: детали из справочника. Клик по строке запускает
// обычный поиск по артикулу с этим производителем — дальше этапы 1 и 2 как всегда.
export default function NameResults() {
  const dispatch = useDispatch()
  const { query, names } = useSelector(selectSearch)
  // Фильтры живут только на этом экране; при новом поиске компонент создаётся заново (key в App)
  const [checkedBrands, setCheckedBrands] = useState([])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const showMore = useCallback(() => setLimit((current) => current + PAGE_SIZE), [])

  const brandOptions = useMemo(() => summarizeStock(names.items, 'brand', 'count'), [names.items])
  const visible = useMemo(
    () =>
      names.items.filter(
        (item) =>
          (!inStockOnly || item.count > 0) &&
          (checkedBrands.length === 0 || checkedBrands.includes(item.brand)),
      ),
    [names.items, inStockOnly, checkedBrands],
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
        <Loader text="Ищем в справочнике…" />
      </div>
    )
  } else if (names.status === 'failed') {
    body = (
      <div className="card-body">
        <ErrorAlert message={names.error} onRetry={() => dispatch(searchByName(query))} />
      </div>
    )
  } else if (names.items.length === 0) {
    body = (
      <div className="card-body text-body-secondary">
        В справочнике по этому названию пусто. Поиск по артикулу — полный, попробуйте номер детали.
      </div>
    )
  } else {
    const rows = visible.slice(0, limit)
    const hasFilters = inStockOnly || checkedBrands.length > 0

    body = (
      <>
        <div className="card-body border-bottom">
          <div className="alert alert-info small mb-0">
            Поиск по справочнику, не подбор по авто. Одно название — сотни деталей; уточните бренд или
            артикул.
          </div>
          {brandOptions.length > 1 && (
            <CheckboxFilter
              id="name-brands"
              title="Производители"
              searchPlaceholder="Найти производителя"
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
                Только в наличии
              </label>
            </div>
            <div className="small text-body-secondary">
              Подходит {visible.length} из {names.items.length}{' '}
              {pluralize(names.items.length, ['детали', 'деталей', 'деталей'])}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-2 align-baseline"
                disabled={!hasFilters}
                onClick={resetFilters}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="card-body text-body-secondary">
            Под выбранные фильтры ничего не подошло.{' '}
            <button type="button" className="btn btn-link p-0 align-baseline" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="list-group list-group-flush">
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
                  {item.count > 0 ? `${item.count} шт.` : 'нет в наличии'}
                </span>
              </button>
            ))}
          </div>
        )}

        {rows.length < visible.length && (
          <LoadMore
            label="Показано деталей"
            shown={rows.length}
            total={visible.length}
            onLoad={showMore}
          />
        )}
        <div className="card-footer bg-body small text-body-secondary">
          Остаток — на момент, когда деталь попала в справочник. Актуальные цены и остатки — после
          выбора детали.
        </div>
      </>
    )
  }

  return (
    <section className="card shadow-sm">
      <div className="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 mb-0">Детали из справочника</h2>
        <span className="small text-body-secondary">«{query}»</span>
      </div>
      {body}
    </section>
  )
}
