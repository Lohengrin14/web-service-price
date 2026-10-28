import { API_DOCS_URL, DATA_SOURCE_URL, REPOSITORY_URL } from '../config'
import { useT } from '../i18n'

// Подвал в одну строку: честный кредит источнику данных и пометка, что это учебный проект
export default function Footer() {
  const { t } = useT()

  return (
    <footer className="app-footer">
      <div className="container d-flex flex-wrap justify-content-between align-items-center column-gap-3">
        <span>
          {t('footer.source')}{' '}
          <a href={DATA_SOURCE_URL} target="_blank" rel="noopener">
            {t('footer.sourceName')}
          </a>
          <span aria-hidden="true"> · </span>
          {t('footer.study')}
        </span>
        <span className="d-flex gap-3">
          <a href={REPOSITORY_URL} target="_blank" rel="noopener">
            {t('footer.repository')}
          </a>
          <a href={API_DOCS_URL} target="_blank" rel="noopener">
            {t('footer.apiDocs')}
          </a>
        </span>
      </div>
    </footer>
  )
}
