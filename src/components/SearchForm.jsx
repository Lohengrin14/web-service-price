import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useT } from '../i18n'
import { fetchBrands, resetSearch, searchByName } from '../store/searchSlice'
import { canonicalNumber, detectMode, normalizeNumber } from '../utils/format'

// Пауза после ввода перед автопоиском: меньше промежуточных запросов, пока человек печатает
const DEBOUNCE_MS = 1000
const MIN_AUTO_LENGTH = 3

// Примеры запросов, которые точно что-то находят: артикул, название, производитель.
// В английской версии без русского названия — названия деталей в справочнике русские.
const EXAMPLES = {
  ru: ['01089', 'колодки', 'bosch'],
  en: ['01089', 'bosch'],
}

export default function SearchForm() {
  const dispatch = useDispatch()
  const { t, lang } = useT()
  const isLoading = useSelector(
    ({ search }) => search.brands.status === 'loading' || search.names.status === 'loading',
  )
  // Текущий поиск: название по справочнику или артикул
  const current = useSelector(({ search }) => search.query || search.number)
  const [value, setValue] = useState(current)
  const [syncedSearch, setSyncedSearch] = useState(current)
  const timerRef = useRef(null)

  // Поиск сменили не из поля (ссылка, «назад», выбор детали из списка) — показываем его в поле.
  // Если набрано то же самое в другом написании, текст пользователя не трогаем.
  if (current !== syncedSearch) {
    setSyncedSearch(current)
    if (canonicalNumber(value) !== canonicalNumber(current)) setValue(current)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const search = (text) => {
    clearTimeout(timerRef.current)
    const normalized = normalizeNumber(text)
    if (!normalized) return

    if (detectMode(normalized) === 'name') dispatch(searchByName(text.trim().replace(/\s+/g, ' ')))
    else dispatch(fetchBrands({ number: normalized }))
  }

  const handleChange = (event) => {
    const text = event.target.value
    setValue(text)
    clearTimeout(timerRef.current)

    if (!text.trim()) {
      dispatch(resetSearch())
    } else if (text.trim().length >= MIN_AUTO_LENGTH) {
      // Поиск «по факту ввода»: ждём паузу, чтобы не отправлять запрос на каждую букву
      timerRef.current = setTimeout(() => search(text), DEBOUNCE_MS)
    }
  }

  // Пример, который сейчас в поле, подсвечиваем — видно, на что нажали
  const isCurrent = (example) => canonicalNumber(example) === canonicalNumber(value)

  const searchExample = (example) => {
    setValue(example)
    search(example)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    search(value)
  }

  return (
    <form className="search-hero mb-4" role="search" onSubmit={handleSubmit}>
      {/* Что вводить, сказано в плейсхолдере; подпись остаётся для экранных дикторов */}
      <label htmlFor="part-number" className="visually-hidden">
        {t('search.label')}
      </label>
      <div className="input-group input-group-lg">
        <input
          id="part-number"
          type="search"
          className="form-control"
          placeholder={t('search.placeholder')}
          value={value}
          onChange={handleChange}
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary search-submit"
          disabled={!value.trim()}
        >
          {isLoading ? (
            <span className="spinner-border spinner-border-sm" aria-label={t('search.loading')} />
          ) : (
            t('search.submit')
          )}
        </button>
      </div>
      <div className="search-examples">
        {t('search.examples')}{' '}
        {(EXAMPLES[lang] ?? EXAMPLES.ru).map((example, index) => (
          <span key={example}>
            {index > 0 && <span aria-hidden="true"> · </span>}
            <button
              type="button"
              className={`btn btn-link${isCurrent(example) ? ' is-active' : ''}`}
              aria-current={isCurrent(example) || undefined}
              onClick={() => searchExample(example)}
            >
              {example}
            </button>
          </span>
        ))}
      </div>
    </form>
  )
}
