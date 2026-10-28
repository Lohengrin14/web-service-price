import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'

const DONE_MS = 1000

// Артикул, который копируется в буфер по клику; на секунду вместо номера — «Скопировано!»
export default function CopyNumber({ number }) {
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

  return (
    <button
      type="button"
      className={`copy-number part-number${copied ? ' is-copied' : ''}`}
      title={t('copy.number')}
      aria-label={`${number}. ${t('copy.number')}`}
      onClick={copy}
    >
      <span aria-hidden="true">{copied ? t('copy.done') : number}</span>
      <span className="visually-hidden" role="status">
        {copied ? t('copy.done') : ''}
      </span>
    </button>
  )
}
