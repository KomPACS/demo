import assert from 'node:assert/strict'
import test from 'node:test'
import { readOnlyStore } from '../src/lib/readonly.ts'

function fakeMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  return {
    matches,
    listeners,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }
}

test('read-only: snapshot follows the media query', () => {
  assert.equal(readOnlyStore(fakeMedia(true)).getSnapshot(), true)
  assert.equal(readOnlyStore(fakeMedia(false)).getSnapshot(), false)
})

test('read-only: subscribe adds and removes the change listener', () => {
  const media = fakeMedia(false)
  const unsubscribe = readOnlyStore(media).subscribe(() => {})
  assert.equal(media.listeners.size, 1)
  unsubscribe()
  assert.equal(media.listeners.size, 0)
})
