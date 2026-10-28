import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchBrands, resetSearch, searchByName } from '../store/searchSlice'
import { canonicalNumber, detectMode, normalizeNumber } from '../utils/format'

// Пауза после ввода перед автопоиском: меньше промежуточных запросов, пока человек печатает
const DEBOUNCE_MS = 1000
const MIN_AUTO_LENGTH = 3

export default function SearchForm() {
  const dispatch = useDispatch()
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

  const handleSubmit = (event) => {
    event.preventDefault()
    search(value)
  }

  return (
    <form className="mb-4" role="search" onSubmit={handleSubmit}>
      <label htmlFor="part-number" className="form-label fw-semibold">
        Артикул или название детали
      </label>
      <div className="input-group input-group-lg">
        <input
          id="part-number"
          type="search"
          className="form-control"
          placeholder="Например, 01089 или колодки"
          value={value}
          onChange={handleChange}
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ minWidth: '7rem' }}
          disabled={!value.trim()}
        >
          {isLoading ? (
            <span className="spinner-border spinner-border-sm" aria-label="Идёт поиск" />
          ) : (
            'Найти'
          )}
        </button>
      </div>
      <div className="form-text">
        Поиск запускается сам через секунду после ввода, по Enter — сразу. Поиск по артикулу — полный.
        По названию — по справочнику, результат может быть неполным.
      </div>
    </form>
  )
}
