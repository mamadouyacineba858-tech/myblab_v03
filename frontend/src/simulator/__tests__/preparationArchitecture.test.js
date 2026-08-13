import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'preparation.js')

describe('MB-CF2-004 architecture', () => {
  it('preparation imports canonicalRegistry and does not import componentDefinitions', () => {
    const source = fs.readFileSync(sourcePath, 'utf-8')
    expect(source).toContain('from "./canonicalRegistry.js"')
    expect(source).not.toContain('from "../config/componentDefinitions.js"')
  })
})
