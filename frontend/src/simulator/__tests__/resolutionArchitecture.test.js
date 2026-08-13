import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'resolution.js')

describe('MB-CF2-SIM-001 architecture', () => {
  it('resolution imports simulationRegistry and no concrete models', () => {
    const source = fs.readFileSync(sourcePath, 'utf-8')
    expect(source).toMatch(/from\s+["']\.\/simulationRegistry\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/models\/PowerModel\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/models\/ResistorModel\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/models\/LdrModel\.js["']/)
    expect(source).not.toMatch(/from\s+["']\.\/models\/ThermistorModel\.js["']/)
  })
})
