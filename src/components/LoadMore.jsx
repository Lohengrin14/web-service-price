import { useEffect, useRef } from 'react'

// Метка под списком: когда пользователь доскроллил до неё, подгружаем следующую порцию.
// shown в зависимостях — после подгрузки пересоздаём наблюдатель: если метка всё ещё
// на экране (высокий экран), он сразу сработает снова.
export default function LoadMore({ label, shown, total, onLoad }) {
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoad()
      },
      { rootMargin: '300px' },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [shown, onLoad])

  return (
    <div ref={ref} className="card-footer bg-body small text-body-secondary text-center">
      {label}: {shown} из {total}. Прокрутите ниже, чтобы увидеть ещё.
    </div>
  )
}
