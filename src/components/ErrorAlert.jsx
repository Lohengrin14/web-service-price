import { translateError, useT } from '../i18n'

// error — ошибка из стора: { codes, params }; текст берём из словаря на текущем языке
export default function ErrorAlert({ error, onRetry }) {
  const { t, lang } = useT()

  return (
    <div
      className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2 mb-0"
      role="alert"
    >
      <span>{translateError(lang, error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
