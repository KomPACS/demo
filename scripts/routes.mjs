#!/usr/bin/env node
// Run: node scripts/routes.mjs   (prints the hash route of every seeded case, one per line)
import { readdir } from 'node:fs/promises'


const dir = new URL('../src/mock/scenarios/', import.meta.url)
for (const f of (await readdir(dir)).filter((f) => f.endsWith('.ts')).sort()) {
  const { default: s } = await import(new URL(f, dir).href)
  for (const t of s.triggers) console.log(`/case/${t.trigger.id}`)
}
