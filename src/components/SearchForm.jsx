import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchBrands, resetSearch } from '../store/searchSlice'

const DEBOUNCE_MS = 600
const MIN_AUTO_LENGTH = 3

export default function SearchForm() {
  const dispatch = useDispatch()
  const isLoading = useSelector((state) => state.search.brands.status === 'loading')
  const [value, setValue] = useState('')
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const search = (text) => {
    clearTimeout(timerRef.current)
    const number = text.trim()
    if (number) dispatch(fetchBrands(number))
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
        Артикул детали
      </label>
      <div className="input-group input-group-lg">
        <input
          id="part-number"
          type="search"
          className="form-control"
          placeholder="Например, 01089"
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
      <div className="form-text">Поиск запускается сам через полсекунды после ввода, по Enter — сразу.</div>
    </form>
  )
}
