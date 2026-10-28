import { useSelector } from 'react-redux'
import BrandList from './components/BrandList'
import OffersTable from './components/OffersTable'
import SearchForm from './components/SearchForm'
import { selectSearch } from './store/searchSlice'

export default function App() {
  const { brands } = useSelector(selectSearch)
  // Если производителей не нашлось или запрос упал, правая колонка не нужна
  const showOffers =
    brands.status === 'loading' || (brands.status === 'succeeded' && brands.items.length > 0)

  return (
    <main className="container py-4 py-lg-5">
      <header className="mb-4">
        <h1 className="h3 mb-1">Поиск автозапчастей</h1>
        <p className="text-body-secondary mb-0">
          Введите артикул, выберите производителя — покажем цены, остатки и аналоги.
        </p>
      </header>

      <SearchForm />

      {brands.status !== 'idle' && (
        <div className="row g-4">
          <div className={showOffers ? 'col-lg-4' : 'col-12'}>
            <BrandList />
          </div>
          {showOffers && (
            <div className="col-lg-8">
              <OffersTable />
            </div>
          )}
        </div>
      )}
    </main>
  )
}
