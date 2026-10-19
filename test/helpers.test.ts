import { test } from 'node:test'
import assert from 'node:assert/strict'
import { birthNumber, isValidBirthNumber } from '../src/mock/rc.ts'
import { day, month, at, workingDaysAgo } from '../src/mock/dates.ts'

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('birthNumber: female gets month + 50, checksum is valid', () => {
  const rc = birthNumber('1968-03-14', 'female', 123)
  assert.equal(isValidBirthNumber(rc), true)
  assert.equal(rc.slice(2, 4), '53')
})

test('birthNumber: male month is unchanged', () => {
  const rc = birthNumber('1990-01-01', 'male', 4)
  assert.equal(rc, '900101/0040')
  assert.equal(isValidBirthNumber(rc), true)
})

test('birthNumber: a serial with remainder 10 is skipped, never written as 0', () => {
  const rc = birthNumber('1990-01-01', 'male', 3)
  assert.equal(rc, '900101/0040')
})

test('birthNumber: throws for a birth date before 1954', () => {
  assert.throws(() => birthNumber('1953-12-31', 'male', 1))
})

test('isValidBirthNumber: false for a wrong check digit', () => {
  assert.equal(isValidBirthNumber('685314/1241'), false)
})

test('isValidBirthNumber: false for an invalid month (13 and 63)', () => {
  assert.equal(isValidBirthNumber('681301/1239'), false)
  assert.equal(isValidBirthNumber('686301/1239'), false)
})

test('isValidBirthNumber: false for an invalid day (32)', () => {
  assert.equal(isValidBirthNumber('680132/1239'), false)
})

test('isValidBirthNumber: false without a slash', () => {
  assert.equal(isValidBirthNumber('6853141240'), false)
})

test('day: 0 is local today, -1 is yesterday across a month boundary', () => {
  const now = new Date()
  assert.equal(day(0), dayKey(now))

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  assert.equal(day(-1), dayKey(yesterday))
})

test('month: offset 0 is the local current month', () => {
  const now = new Date()
  assert.equal(month(0), `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
})

test('at: returns a parseable ISO datetime', () => {
  const iso = at(0, '14:30')
  assert.equal(Number.isNaN(Date.parse(iso)), false)
})

test('workingDaysAgo: skips Saturday and Sunday', () => {
  const d = new Date()
  let left = 2
  while (left > 0) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) left--
  }
  assert.equal(workingDaysAgo(2), dayKey(d))
})
