import { useEffect, useState } from 'react'
import { useT } from '../i18n'

const STORAGE_KEY = 'parts-search:theme'

// Тема уже выставлена до отрисовки скриптом в index.html: выбор пользователя, иначе системная
const currentTheme = () => document.documentElement.getAttribute('data-bs-theme') ?? 'light'

function savedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export default function ThemeToggle() {
  const { t } = useT()
  const [theme, setTheme] = useState(currentTheme)

  // Пока пользователь сам не выбрал тему, следуем за системной
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const followSystem = (event) => {
      if (savedTheme()) return
      const next = event.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-bs-theme', next)
      setTheme(next)
    }
    media.addEventListener('change', followSystem)
    return () => media.removeEventListener('change', followSystem)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-bs-theme', next)
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Не сохранилось — в следующий раз будет системная тема
    }
  }

  const label = t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')

  return (
    <button type="button" className="btn btn-quiet btn-sm" title={label} aria-label={label} onClick={toggle}>
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  )
}
