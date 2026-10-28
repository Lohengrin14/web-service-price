import { useDispatch } from 'react-redux'
import { API_DOCS_URL, APP_NAME, REPOSITORY_URL } from '../config'
import { LANGUAGES, useT } from '../i18n'
import { setLanguage } from '../store/langSlice'
import LogoMark from './LogoMark'
import ThemeToggle from './ThemeToggle'

// Шапка: своя айдентика (лупа + «Артикул»), язык, тема и ссылки на код и документацию API.
// Без меню, корзины и входа — это инструмент, а не магазин.
export default function Header() {
  const dispatch = useDispatch()
  const { t, lang } = useT()

  return (
    <header className="app-header">
      <div className="container h-100 d-flex align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2 text-nowrap overflow-hidden">
          <LogoMark />
          <span className="app-wordmark">{APP_NAME}</span>
          {/* На узком экране тэглайн прячем, чтобы шапка не переносилась */}
          <span className="app-tagline d-none d-md-inline">{t('header.tagline')}</span>
        </div>

        <nav className="d-flex align-items-center gap-2 flex-shrink-0" aria-label={t('header.nav')}>
          <a
            className="header-link d-none d-sm-inline"
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
          <a
            className="header-link d-none d-sm-inline"
            href={API_DOCS_URL}
            target="_blank"
            rel="noopener"
          >
            API
          </a>
          <div className="btn-group btn-group-sm" role="group" aria-label={t('app.language')}>
            {LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                className="btn btn-quiet"
                aria-pressed={code === lang}
                onClick={() => dispatch(setLanguage(code))}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
