// Имя продукта и внешние ссылки — в одном месте, чтобы менять без поиска по коду.
// Своя нейтральная айдентика: Фаворит упоминается только как источник данных.
export const APP_NAME = 'Артикул'
export const REPOSITORY_URL = 'https://github.com/Lohengrin14/web-service-price'
export const API_DOCS_URL = 'https://lk.favorit-parts.ru/static/wsprice.pdf'
export const DATA_SOURCE_URL = 'https://favorit-parts.ru'

// Публичный демо-ключ из документации API — он опубликован в самом PDF и секретом не является.
// Нужен только для статической сборки без прокси (GitHub Pages): там браузер ходит в API сам.
// Настоящий ключ покупателя сюда класть нельзя — только в прокси (FAVORIT_API_KEY).
export const PUBLIC_DEMO_KEY = '00000000-0000-0000-0000-000000000001'
