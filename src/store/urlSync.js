import { DEFAULT_LANGUAGE } from '../i18n'
import { normalizeNumber } from '../utils/format'
import { fetchBrands, resetSearch, searchByName } from './searchSlice'

// Состояние поиска в адресной строке: ?number=01089&brand=FEBI или ?q=колодки, плюс ?lang=en.
// Ссылкой можно поделиться, а кнопка «назад» возвращает к предыдущему поиску —
// например, от выбранной детали к списку найденного по названию. Язык читается
// при открытии ссылки (langSlice) и сохраняется при каждой записи адреса;
// «назад» и «вперёд» его не переключают.

export function readSearch(search) {
  const params = new URLSearchParams(search)
  return {
    query: (params.get('q') ?? '').trim().replace(/\s+/g, ' '),
    number: normalizeNumber(params.get('number')),
    brand: (params.get('brand') ?? '').trim(),
  }
}

export function searchToQuery({ query, number, selected }, lang = DEFAULT_LANGUAGE) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (number) params.set('number', number)
  if (number && selected?.brand) params.set('brand', selected.brand)
  if (lang !== DEFAULT_LANGUAGE) params.set('lang', lang)
  return params.toString()
}

function openSearch(store, { query, number, brand }) {
  if (query) store.dispatch(searchByName(query))
  else if (number) store.dispatch(fetchBrands({ number, brand }))
  else store.dispatch(resetSearch())
}

export function startUrlSync(store) {
  // Открыли ссылку — восстанавливаем поиск
  const initial = readSearch(window.location.search)
  if (initial.query || initial.number) openSearch(store, initial)

  // «Назад» и «вперёд» в браузере
  window.addEventListener('popstate', () => openSearch(store, readSearch(window.location.search)))

  store.subscribe(() => {
    const { search, lang } = store.getState()
    // Пока ищем, адрес не трогаем: сразу запишем артикул вместе с производителем.
    // Поиск по названию, не нашедший ничего, переходит в поиск по артикулу — его и запишем.
    if (search.brands.status === 'loading' || search.names.status === 'loading') return

    const query = searchToQuery(search, lang)
    const { location, history } = window
    if (query === location.search.slice(1)) return

    const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`
    // Новый поиск — новая запись в истории; другой производитель того же артикула
    // или смена языка — замена
    const previous = readSearch(location.search)
    const isNewSearch = previous.query !== search.query || previous.number !== search.number
    if (isNewSearch) history.pushState(null, '', url)
    else history.replaceState(null, '', url)
  })
}
