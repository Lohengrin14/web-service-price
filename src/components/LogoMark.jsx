// Лого-марка продукта — та же лупа, что в favicon: янтарный квадрат, тёмная лупа
export default function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="#f59e0b" />
      <circle cx="14" cy="14" r="7" fill="none" stroke="#020617" strokeWidth="3" />
      <path d="M19 19l6 6" stroke="#020617" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
