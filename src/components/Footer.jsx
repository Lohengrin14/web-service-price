import { API_DOCS_URL, DATA_SOURCE_URL, REPOSITORY_URL } from '../config'
import { useT } from '../i18n'

// Подвал: честный кредит источнику данных и пометка, что это учебный проект
export default function Footer() {
  const { t } = useT()

  return (
    <footer className="app-footer">
      <div className="container d-flex flex-wrap justify-content-between gap-3">
        <div>
          <p className="mb-1">
            {t('footer.source')}{' '}
            <a href={DATA_SOURCE_URL} target="_blank" rel="noopener">
              {t('footer.sourceName')}
            </a>
          </p>
          <p className="mb-0">{t('footer.study')}</p>
        </div>
        <div className="d-flex gap-3">
          <a href={REPOSITORY_URL} target="_blank" rel="noopener">
            {t('footer.repository')}
          </a>
          <a href={API_DOCS_URL} target="_blank" rel="noopener">
            {t('footer.apiDocs')}
          </a>
        </div>
      </div>
    </footer>
  )
}
