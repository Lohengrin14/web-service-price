import { normalizeNumber } from '../utils/format'
import { fetchBrands, resetSearch } from './searchSlice'

// Состояние поиска в адресной строке: ?number=01089&brand=FEBI.
// Ссылкой можно поделиться, а кнопка «назад» возвращает к предыдущему артикулу.

export function readSearch(search) {
  const params = new URLSearchParams(search)
  return {
    number: normalizeNumber(params.get('number')),
    brand: (params.get('brand') ?? '').trim(),
  }
}

export function searchToQuery({ number, selected }) {
  const params = new URLSearchParams()
  if (number) params.set('number', number)
  if (number && selected?.brand) params.set('brand', selected.brand)
  return params.toString()
}

function openSearch(store, { number, brand }) {
  store.dispatch(number ? fetchBrands({ number, brand }) : resetSearch())
}

export function startUrlSync(store) {
  // Открыли ссылку — восстанавливаем поиск
  const initial = readSearch(window.location.search)
  if (initial.number) openSearch(store, initial)

  // «Назад» и «вперёд» в браузере
  window.addEventListener('popstate', () => openSearch(store, readSearch(window.location.search)))

  store.subscribe(() => {
    const { search } = store.getState()
    // Пока ищем производителей, адрес не трогаем: сразу запишем артикул вместе с производителем
    if (search.brands.status === 'loading') return

    const query = searchToQuery(search)
    const { location, history } = window
    if (query === location.search.slice(1)) return

    const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`
    // Новый артикул — новая запись в истории; другой производитель того же артикула — замена
    const isNewNumber = readSearch(location.search).number !== search.number
    if (isNewNumber) history.pushState(null, '', url)
    else history.replaceState(null, '', url)
  })
}
