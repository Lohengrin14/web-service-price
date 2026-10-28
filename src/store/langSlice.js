import { createSlice } from '@reduxjs/toolkit'
import { DEFAULT_LANGUAGE, isLanguage } from '../i18n'

const STORAGE_KEY = 'parts-search:lang'

// Язык: из ссылки (?lang=en), иначе выбранный раньше (localStorage), иначе русский.
// Язык браузера не учитываем: русский по умолчанию — так задумано.
function initialLanguage() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (isLanguage(fromUrl)) return fromUrl
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Нет window или localStorage (тесты, приватный режим) — просто язык по умолчанию
  }
  return DEFAULT_LANGUAGE
}

export function saveLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Не сохранилось — в следующий раз будет язык по умолчанию
  }
}

const langSlice = createSlice({
  name: 'lang',
  initialState: initialLanguage,
  reducers: {
    setLanguage: (state, action) => (isLanguage(action.payload) ? action.payload : state),
  },
})

export const { setLanguage } = langSlice.actions
export default langSlice.reducer
