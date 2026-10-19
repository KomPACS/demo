import { createMockFetch } from './fetch.ts'
import { createStore } from './store.ts'
import type { Scenario } from './types.ts'

const modules = import.meta.glob<{ default: Scenario }>('./scenarios/*.ts', { eager: true })

export const store = createStore(Object.values(modules).map((m) => m.default))
export const reset = () => store.reset()
export const mockFetch = createMockFetch(store)
