import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const DEFAULT_API_URL = 'http://api.favorit-parts.ru/hs/hsprice/'

// Параметры, которые браузер может передать в API. Ключ добавляет только прокси.
// info=on нужен, чтобы API вернул признак невозвратности notRefund.
const ALLOWED_PARAMS = ['number', 'brand', 'analogues', 'info']

// Браузер ходит на /api/search, а dev-сервер Vite пересылает запрос в API
// и подставляет ключ. Так нет проблем с CORS и HTTP, а ключ не попадает в браузер.
function createApiProxy(env) {
  const apiUrl = new URL(env.FAVORIT_API_URL || DEFAULT_API_URL)
  const apiKey = env.FAVORIT_API_KEY || ''

  if (!apiKey) {
    console.warn(
      '\n[parts-search] FAVORIT_API_KEY не задан. Скопируйте .env.example в .env.local и впишите ключ.\n',
    )
  }

  return {
    '/api/search': {
      target: apiUrl.origin,
      changeOrigin: true,
      rewrite: (path) => {
        const incoming = new URL(path, 'http://localhost').searchParams
        const query = new URLSearchParams()

        for (const name of ALLOWED_PARAMS) {
          const value = incoming.get(name)
          if (value) query.set(name, value)
        }
        query.set('key', apiKey)

        return `${apiUrl.pathname}?${query}`
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  // Загружаем только переменные FAVORIT_*: они нужны серверу и в бандл не попадают
  const env = loadEnv(mode, process.cwd(), 'FAVORIT_')
  const proxy = createApiProxy(env)

  return {
    // Для GitHub Pages сайт живёт в подпапке /<репозиторий>/ — путь задаёт сборка (BASE_PATH)
    base: process.env.BASE_PATH || '/',
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})
