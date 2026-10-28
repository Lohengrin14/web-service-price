import { useT } from '../i18n'

export default function Loader({ text }) {
  const { t } = useT()

  return (
    <div className="d-flex align-items-center gap-2 text-body-secondary" role="status">
      <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
      <span>{text ?? t('common.loading')}</span>
    </div>
  )
}
