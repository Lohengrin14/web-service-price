import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import BrandList from './components/BrandList'
import NameResults from './components/NameResults'
import OffersTable from './components/OffersTable'
import SearchForm from './components/SearchForm'
import { LANGUAGES, useT } from './i18n'
import { saveLanguage, setLanguage } from './store/langSlice'
import { selectSearch } from './store/searchSlice'

export default function App() {
  const dispatch = useDispatch()
  const { t, lang } = useT()
  const { query, names, number, brands } = useSelector(selectSearch)
  // Если производителей не нашлось или запрос упал, правая колонка не нужна
  const showOffers =
    brands.status === 'loading' || (brands.status === 'succeeded' && brands.items.length > 0)

  // Язык страницы и заголовок вкладки меняются вместе с языком; выбор запоминаем
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t('app.title')
    saveLanguage(lang)
  }, [lang, t])

  return (
    <main className="container py-4 py-lg-5">
      <header className="mb-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h1 className="h3 mb-1">{t('app.title')}</h1>
          <p className="text-body-secondary mb-0">{t('app.subtitle')}</p>
        </div>
        <div className="btn-group btn-group-sm" role="group" aria-label={t('app.language')}>
          {LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              className={`btn ${code === lang ? 'btn-secondary' : 'btn-outline-secondary'}`}
              aria-pressed={code === lang}
              onClick={() => dispatch(setLanguage(code))}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

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
  )
}
