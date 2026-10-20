import assert from 'node:assert/strict'
import test from 'node:test'
import { sortPriors } from '../src/lib/priors.ts'

const c = (id: string, date: string | null, is_baseline = false) => ({ id, date, is_baseline })

test('sortPriors: newest first', () => {
  const sorted = sortPriors([c('a', '2026-01-10'), c('b', '2026-05-20'), c('c', '2025-12-01')])
  assert.deepEqual(sorted.map((x) => x.id), ['b', 'a', 'c'])
})

test('sortPriors: baseline pinned first regardless of date', () => {
  const sorted = sortPriors([c('newest', '2026-06-01'), c('base', '2020-01-01', true), c('older', '2024-01-01')])
  assert.deepEqual(sorted.map((x) => x.id), ['base', 'newest', 'older'])
})

test('sortPriors: partial year sorts after a full date of the same year', () => {
  const sorted = sortPriors([c('year', '2026'), c('full', '2026-05-17')])
  assert.deepEqual(sorted.map((x) => x.id), ['full', 'year'])
})

test('sortPriors: partial month sorts after a full date of the same month', () => {
  const sorted = sortPriors([c('month', '2026-05'), c('full', '2026-05-17'), c('earlier', '2026-04-30')])
  assert.deepEqual(sorted.map((x) => x.id), ['full', 'month', 'earlier'])
})

test('sortPriors: null date sorts last', () => {
  const sorted = sortPriors([c('undated', null), c('dated', '2020-01-01')])
  assert.deepEqual(sorted.map((x) => x.id), ['dated', 'undated'])
})
