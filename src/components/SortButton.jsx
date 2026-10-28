// Заголовок столбца, который сортирует по клику: первый клик — первый вариант из orders,
// повторный — второй. orders: [[значение сортировки, по возрастанию ли], ...].
// Значок ↕ виден всегда, чтобы было понятно, что по столбцу можно сортировать.
export default function SortButton({ label, orders, sort, onSort }) {
  const index = orders.findIndex(([value]) => value === sort)
  const active = orders[index]
  const next = orders[index === 0 ? 1 : 0][0]

  return (
    <button
      type="button"
      className="sort-button btn btn-link p-0 border-0 fw-semibold text-reset text-decoration-none text-nowrap"
      title="Нажмите, чтобы отсортировать"
      aria-pressed={Boolean(active)}
      onClick={() => onSort(next)}
    >
      <span className="sort-label">{label}</span>{' '}
      <span className={active ? 'text-primary' : 'text-body-tertiary'} aria-hidden="true">
        {active ? (active[1] ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )
}
