import { useSyncExternalStore } from 'react'

export const READ_ONLY_QUERY = '(max-width: 767px)'

type Media = {
  matches: boolean
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

export function readOnlyStore(media: Media) {
  return {
    subscribe(onChange: () => void) {
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    getSnapshot: () => media.matches,
  }
}

const media = (globalThis as { matchMedia?: (query: string) => Media }).matchMedia?.(READ_ONLY_QUERY)
const store = media ? readOnlyStore(media) : null

export function useReadOnly(): boolean {
  return useSyncExternalStore(store?.subscribe ?? (() => () => {}), store?.getSnapshot ?? (() => false))
}
