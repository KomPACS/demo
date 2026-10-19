function checksumRemainder(yy: string, mm: string, dd: string, sss: string): number {
  return Number(`${yy}${mm}${dd}${sss}`) % 11
}

export function birthNumber(born: string, sex: 'male' | 'female', serial: number): string {
  const year = Number(born.slice(0, 4))
  if (year < 1954) throw new Error(`birthNumber: born before 1954 is out of scope: ${born}`)
  const yy = String(year % 100).padStart(2, '0')
  const birthMonth = Number(born.slice(5, 7))
  const mm = String(sex === 'female' ? birthMonth + 50 : birthMonth).padStart(2, '0')
  const dd = born.slice(8, 10)
  let s = serial
  for (;;) {
    const sss = String(s).padStart(3, '0')
    const rem = checksumRemainder(yy, mm, dd, sss)
    if (rem !== 10) return `${yy}${mm}${dd}/${sss}${rem}`
    s++
  }
}

export function isValidBirthNumber(rc: string): boolean {
  const match = /^(\d{2})(\d{2})(\d{2})\/(\d{3})(\d)$/.exec(rc)
  if (!match) return false
  const [, yy, mm, dd, sss, c] = match
  const month = Number(mm) > 50 ? Number(mm) - 50 : Number(mm)
  if (month < 1 || month > 12) return false
  if (Number(dd) < 1 || Number(dd) > 31) return false
  return Number(`${yy}${mm}${dd}${sss}${c}`) % 11 === 0
}
