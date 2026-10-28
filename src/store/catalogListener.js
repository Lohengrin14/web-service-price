import { createListenerMiddleware } from '@reduxjs/toolkit'
import { learn } from '../catalog'
import { fetchBrands, fetchOffers } from './searchSlice'

// Самообучение справочника: всё, что пришло из API, запоминаем в localStorage.
// Побочный эффект живёт здесь, а не в редьюсерах; сам справочник в Redux не хранится.
export const catalogListener = createListenerMiddleware()

catalogListener.startListening({
  actionCreator: fetchBrands.fulfilled,
  effect: (action) => {
    learn(action.payload.map(({ name, number, brand, count }) => ({ name, number, brand, count })))
  },
})

catalogListener.startListening({
  actionCreator: fetchOffers.fulfilled,
  effect: (action) => {
    // В предложениях строка на каждый склад — собираем детали и суммируем остаток
    const parts = new Map()
    for (const { partKey, name, number, brand, stock } of action.payload) {
      const part = parts.get(partKey) ?? { name, number, brand, count: 0 }
      part.count += stock
      parts.set(partKey, part)
    }
    learn([...parts.values()])
  },
})
