import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'canonicalRegistry.js')

describe('ADR-012 canonical Registry architecture', () => {
  it('does not import executable simulation models', () => {
    const source = fs.readFileSync(sourcePath, 'utf-8')
    expect(source).not.toMatch(/from\s+["']\.\/models\//)
    expect(source).not.toMatch(/MODELS_BY_TYPE/)
  })

  it('declares defaultParameters as part of the canonical contract', () => {
    const source = fs.readFileSync(sourcePath, 'utf-8')
    expect(source).toMatch(/DECLARED_DEFAULT_PARAMETERS/)
    expect(source).toMatch(/defaultParameters:/)
  })
})
