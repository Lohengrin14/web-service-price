import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'

const DONE_MS = 1000

// Копирование артикула в буфер по клику.
// variant="text" — кнопкой служит сам номер, на секунду вместо него «Скопировано!»;
// variant="icon" — маленькая иконка рядом с номером, на секунду вместо неё галочка.
export default function CopyNumber({ number, variant = 'text', tabIndex }) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number)
    } catch {
      return // Буфер недоступен (старый браузер, нет разрешения) — просто ничего не показываем
    }
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), DONE_MS)
  }

  const status = (
    <span className="visually-hidden" role="status">
      {copied ? t('copy.done') : ''}
    </span>
  )

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`copy-icon${copied ? ' is-copied' : ''}`}
        title={t('copy.number')}
        aria-label={`${t('copy.number')} ${number}`}
        tabIndex={tabIndex}
        onClick={copy}
      >
        <span aria-hidden="true">
          {copied ? (
            '✓'
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
              <g fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="5" width="9" height="9" rx="1.5" />
                <path d="M11 3.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.5" />
              </g>
            </svg>
          )}
        </span>
        {status}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`copy-number part-number${copied ? ' is-copied' : ''}`}
      title={t('copy.number')}
      aria-label={`${number}. ${t('copy.number')}`}
      tabIndex={tabIndex}
      onClick={copy}
    >
      <span aria-hidden="true">{copied ? t('copy.done') : number}</span>
      {status}
    </button>
  )
}
