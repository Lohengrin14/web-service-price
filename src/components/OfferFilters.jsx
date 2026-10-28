import { useDispatch, useSelector } from 'react-redux'
import {
  resetFilters,
  selectFilters,
  selectHasActiveFilters,
  selectOfferBrands,
  selectOfferCities,
  selectVisibleOffers,
  setBrands,
  setCities,
  setInStockOnly,
  setMaxPrice,
  setMinPrice,
  setSort,
  toggleBrand,
  toggleCity,
} from '../store/filtersSlice'
import { pluralize } from '../utils/format'
import CheckboxFilter from './CheckboxFilter'

const SORT_OPTIONS = [
  ['default', 'По умолчанию'],
  ['price-asc', 'Сначала дешёвые'],
  ['price-desc', 'Сначала дорогие'],
  ['stock-desc', 'Больше остаток'],
  ['stock-asc', 'Меньше остаток'],
  ['shipment-asc', 'Раньше отгрузка'],
  ['shipment-desc', 'Позже отгрузка'],
]

export default function OfferFilters() {
  const dispatch = useDispatch()
  const filters = useSelector(selectFilters)
  const brands = useSelector(selectOfferBrands)
  const cities = useSelector(selectOfferCities)
  const shown = useSelector(selectVisibleOffers).length
  const total = useSelector((state) => state.search.offers.items.length)
  const hasActiveFilters = useSelector(selectHasActiveFilters)

  return (
    <div className="card-body border-bottom">
      <div className="row g-2">
        <div className="col-sm-6">
          <label htmlFor="price-min" className="form-label small mb-1">
            Цена, ₽
          </label>
          <div className="input-group input-group-sm">
            <input
              id="price-min"
              type="number"
              min="0"
              inputMode="decimal"
              className="form-control"
              placeholder="от"
              value={filters.minPrice}
              onChange={(event) => dispatch(setMinPrice(event.target.value))}
            />
            <input
              type="number"
              min="0"
              inputMode="decimal"
              className="form-control"
              placeholder="до"
              aria-label="Цена до"
              value={filters.maxPrice}
              onChange={(event) => dispatch(setMaxPrice(event.target.value))}
            />
          </div>
        </div>
        <div className="col-sm-6">
          <label htmlFor="offer-sort" className="form-label small mb-1">
            Сортировка
          </label>
          <select
            id="offer-sort"
            className="form-select form-select-sm"
            value={filters.sort}
            onChange={(event) => dispatch(setSort(event.target.value))}
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {brands.length > 1 && (
        <CheckboxFilter
          id="offer-brands"
          title="Производители"
          searchPlaceholder="Найти производителя"
          options={brands}
          checked={filters.brands}
          onToggle={(value) => dispatch(toggleBrand(value))}
          onSetAll={(values) => dispatch(setBrands(values))}
        />
      )}
      {cities.length > 1 && (
        <CheckboxFilter
          id="offer-cities"
          title="Города"
          searchPlaceholder="Найти город"
          emptyLabel="Нет в наличии"
          options={cities}
          checked={filters.cities}
          onToggle={(value) => dispatch(toggleCity(value))}
          onSetAll={(values) => dispatch(setCities(values))}
        />
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
        <div className="form-check form-switch mb-0">
          <input
            id="in-stock-only"
            type="checkbox"
            role="switch"
            className="form-check-input"
            checked={filters.inStockOnly}
            onChange={(event) => dispatch(setInStockOnly(event.target.checked))}
          />
          <label htmlFor="in-stock-only" className="form-check-label small">
            Только в наличии
          </label>
        </div>
        <div className="small text-body-secondary">
          Подходит {shown} из {total} {pluralize(total, ['предложения', 'предложений', 'предложений'])}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 ms-2 align-baseline"
            disabled={!hasActiveFilters}
            onClick={() => dispatch(resetFilters())}
          >
            Сбросить фильтры
          </button>
        </div>
      </div>
    </div>
  )
}
