#!/usr/bin/env node
// Run: node scripts/shots.mjs [--base http://localhost:5173] [--out shots] [--widths 1440,1024,390] [route ...]
// Screenshots each hash route at each width and prints console errors. Exit 1 on any error.
import { mkdirSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: 'string', default: 'http://localhost:5173' },
    out: { type: 'string', default: 'shots' },
    widths: { type: 'string', default: '1440,1024,390' },
    wait: { type: 'string', default: '1500' },
  },
})
const routes = positionals.length ? positionals : ['/']
mkdirSync(values.out, { recursive: true })
const browser = await chromium.launch()
let errors = 0
for (const width of values.widths.split(',').map(Number)) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  page.on('console', (m) => m.type() === 'error' && (errors++, console.log(`[${width}] console: ${m.text()}`)))
  page.on('pageerror', (e) => (errors++, console.log(`[${width}] pageerror: ${e.message}`)))
  for (const route of routes) {
    await page.goto(`${values.base}/#${route}`)
    await page.waitForTimeout(Number(values.wait))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    if (overflow) console.log(`[${width}] horizontal scroll: ${route}`)
    const name = `${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}-${width}.png`
    await page.screenshot({ path: `${values.out}/${name}`, fullPage: true })
    console.log(`${values.out}/${name}`)
  }
  await page.close()
}
await browser.close()
process.exit(errors ? 1 : 0)
