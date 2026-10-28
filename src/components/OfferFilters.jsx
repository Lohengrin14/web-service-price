import { useDispatch, useSelector } from 'react-redux'
import { useT } from '../i18n'
import {
  resetFilters,
  selectFilters,
  selectHasActiveFilters,
  selectOfferBrands,
  selectOfferCities,
  selectPriceScale,
  selectVisibleOffers,
  setBrands,
  setCities,
  setInStockOnly,
  setMaxPrice,
  setMinPrice,
  setOwnOnly,
  setReturnableOnly,
  setSort,
  toggleBrand,
  toggleCity,
} from '../store/filtersSlice'
import CheckboxFilter from './CheckboxFilter'
import PriceRange from './PriceRange'

// Подписи — в словаре под ключами sort.<значение>
const SORT_OPTIONS = [
  'default',
  'price-asc',
  'price-desc',
  'stock-desc',
  'stock-asc',
  'shipment-asc',
  'shipment-desc',
]

function FilterSwitch({ id, label, checked, onChange }) {
  return (
    <div className="form-check form-switch mb-0">
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="form-check-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id} className="form-check-label small">
        {label}
      </label>
    </div>
  )
}

export default function OfferFilters() {
  const dispatch = useDispatch()
  const { t } = useT()
  const filters = useSelector(selectFilters)
  const brands = useSelector(selectOfferBrands)
  const cities = useSelector(selectOfferCities)
  const priceScale = useSelector(selectPriceScale)
  const shown = useSelector(selectVisibleOffers).length
  const total = useSelector((state) => state.search.offers.items.length)
  const hasActiveFilters = useSelector(selectHasActiveFilters)

  return (
    <div className="card-body border-bottom">
      <div className="row gx-5 gy-3">
        {/* Ползунок нужен, только если в выдаче есть хотя бы две разные цены */}
        {priceScale && (
          <div className="col-sm-6">
            <PriceRange
              scale={priceScale}
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
              onMinChange={(value) => dispatch(setMinPrice(value))}
              onMaxChange={(value) => dispatch(setMaxPrice(value))}
            />
          </div>
        )}
        <div className="col-sm-6">
          <label htmlFor="offer-sort" className="form-label small mb-1">
            {t('filters.sort')}
          </label>
          <select
            id="offer-sort"
            className="form-select form-select-sm"
            value={filters.sort}
            onChange={(event) => dispatch(setSort(event.target.value))}
          >
            {SORT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(`sort.${value}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {brands.length > 1 && (
        <CheckboxFilter
          id="offer-brands"
          title={t('brands.title')}
          searchPlaceholder={t('filters.findBrand')}
          options={brands}
          checked={filters.brands}
          onToggle={(value) => dispatch(toggleBrand(value))}
          onSetAll={(values) => dispatch(setBrands(values))}
        />
      )}
      {cities.length > 1 && (
        <CheckboxFilter
          id="offer-cities"
          title={t('filters.cities')}
          searchPlaceholder={t('filters.findCity')}
          options={cities}
          checked={filters.cities}
          onToggle={(value) => dispatch(toggleCity(value))}
          onSetAll={(values) => dispatch(setCities(values))}
        />
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
        <div className="d-flex flex-wrap column-gap-4 row-gap-1">
          <FilterSwitch
            id="in-stock-only"
            label={t('common.inStockOnly')}
            checked={filters.inStockOnly}
            onChange={(value) => dispatch(setInStockOnly(value))}
          />
          <FilterSwitch
            id="own-only"
            label={t('filters.ownOnly')}
            checked={filters.ownOnly}
            onChange={(value) => dispatch(setOwnOnly(value))}
          />
          <FilterSwitch
            id="returnable-only"
            label={t('filters.returnableOnly')}
            checked={filters.returnableOnly}
            onChange={(value) => dispatch(setReturnableOnly(value))}
          />
        </div>
        <div className="small text-body-secondary">
          {t('filters.matching', { shown, count: total })}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 ms-2 align-baseline"
            disabled={!hasActiveFilters}
            onClick={() => dispatch(resetFilters())}
          >
            {t('common.resetFilters')}
          </button>
        </div>
      </div>
    </div>
  )
}
