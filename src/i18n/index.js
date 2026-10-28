import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import en from './en'
import ru from './ru'

// Свои словари вместо i18next: два языка и одна функция подстановки — проще и легче
export const LANGUAGES = ['ru', 'en']
export const DEFAULT_LANGUAGE = 'ru'

const DICTIONARIES = { ru, en }
const LOCALES = { ru: 'ru-RU', en: 'en-US' }

export const localeOf = (lang) => LOCALES[lang] ?? LOCALES[DEFAULT_LANGUAGE]
export const isLanguage = (value) => LANGUAGES.includes(value)

// translate('en', 'offers.count', { count: 5 }) → '5 offers'.
// Нет ключа в языке — берём русский, нет и там — показываем сам ключ, чтобы пропуск был заметен.
export function translate(lang, key, params = {}) {
  let value = DICTIONARIES[lang]?.[key] ?? ru[key] ?? key

  if (typeof value === 'object') {
    const form = new Intl.PluralRules(localeOf(lang)).select(params.count ?? 0)
    value = value[form] ?? value.other
  }

  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
}

// Ошибка из стора — { codes, params } — в текст на нужном языке
export function translateError(lang, error) {
  const codes = error?.codes?.length ? error.codes : ['unknown']
  return codes.map((code) => translate(lang, `errors.${code}`, error?.params)).join(' ')
}

export function useT() {
  const lang = useSelector((state) => state.lang)
  return useMemo(() => ({ lang, t: (key, params) => translate(lang, key, params) }), [lang])
}
