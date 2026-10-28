import { useEffect, useState } from 'react'
import { useT } from '../i18n'

const STORAGE_KEY = 'parts-search:theme'

// Тема уже выставлена до отрисовки скриптом в index.html: выбор пользователя, иначе системная
const currentTheme = () => document.documentElement.getAttribute('data-bs-theme') ?? 'light'

// Меняем тему без плавных переходов: иначе кнопки и поля догоняют фон с задержкой
// и при переключении видно мерцание. Переходы возвращаем после отрисовки нового кадра.
function applyTheme(theme) {
  const root = document.documentElement
  root.classList.add('theme-switching')
  root.setAttribute('data-bs-theme', theme)
  // Первый кадр рисуется уже в новой теме без переходов, со второго они снова работают
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
}

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
      applyTheme(next)
      setTheme(next)
    }
    media.addEventListener('change', followSystem)
    return () => media.removeEventListener('change', followSystem)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
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
