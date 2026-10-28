import { useT } from '../i18n'

// Наличие: зелёная точка и количество или приглушённое «нет в наличии»
export default function StockPill({ count }) {
  const { t } = useT()

  return count > 0 ? (
    <span className="stock-pill is-in">{t('common.pcs', { count })}</span>
  ) : (
    <span className="stock-pill is-out">{t('common.outOfStock')}</span>
  )
}
