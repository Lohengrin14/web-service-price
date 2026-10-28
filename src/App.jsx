import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import BrandList from './components/BrandList'
import Footer from './components/Footer'
import Header from './components/Header'
import NameResults from './components/NameResults'
import OffersTable from './components/OffersTable'
import SearchForm from './components/SearchForm'
import { APP_NAME } from './config'
import { useT } from './i18n'
import { saveLanguage } from './store/langSlice'
import { selectSearch } from './store/searchSlice'

export default function App() {
  const { t, lang } = useT()
  const { query, names, number, brands } = useSelector(selectSearch)
  // Если производителей не нашлось или запрос упал, правая колонка не нужна
  const showOffers =
    brands.status === 'loading' || (brands.status === 'succeeded' && brands.items.length > 0)

  // Язык страницы и заголовок вкладки меняются вместе с языком; выбор запоминаем
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = `${APP_NAME} — ${t('app.title')}`
    saveLanguage(lang)
  }, [lang, t])

  return (
    // Колонка на всю высоту: подвал прижимается к низу и на короткой странице
    <div className="d-flex flex-column min-vh-100">
      <Header />

      <main className="container flex-grow-1 py-4 py-lg-5">
        <div className="mb-4">
          <h1 className="app-title mb-1">{t('app.title')}</h1>
          <p className="text-body-secondary mb-0">{t('app.subtitle')}</p>
        </div>

        <SearchForm />

        {/* key: при новом названии фильтры списка начинаются заново */}
        {names.status !== 'idle' && <NameResults key={query} />}

        {brands.status !== 'idle' && (
          <div className="row g-4">
            <div className={showOffers ? 'col-lg-4' : 'col-12'}>
              {/* key: при новом артикуле строка поиска по производителям очищается */}
              <BrandList key={number} />
            </div>
            {showOffers && (
              <div className="col-lg-8">
                <OffersTable />
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
