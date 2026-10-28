import { useT } from '../i18n'

// Скелетон вместо голого спиннера: серые строки на месте будущего списка.
// Ширины чередуем, чтобы строки не выглядели одинаковыми. Текст — для экранных дикторов.
const WIDTHS = ['col-7', 'col-5', 'col-8', 'col-6', 'col-4']

export default function Skeleton({ text, rows = 5 }) {
  const { t } = useT()

  return (
    <div className="card-body skeleton placeholder-glow" role="status" aria-live="polite">
      <span className="visually-hidden">{text ?? t('common.loading')}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="d-flex justify-content-between gap-3 py-2" aria-hidden="true">
          <span className={`placeholder rounded ${WIDTHS[index % WIDTHS.length]}`} />
          <span className="placeholder rounded col-2" />
        </div>
      ))}
    </div>
  )
}
