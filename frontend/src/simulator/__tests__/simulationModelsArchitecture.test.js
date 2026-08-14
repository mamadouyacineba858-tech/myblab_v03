import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const modelsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'models')
const modelFiles = ['PowerModel.js', 'ResistorModel.js', 'LdrModel.js', 'ThermistorModel.js']

describe('ADR-012 executable model boundary', () => {
  for (const file of modelFiles) {
    it(`${file} contains no declarative Registry properties`, () => {
      const source = fs.readFileSync(path.join(modelsDirectory, file), 'utf-8')
      expect(source).not.toMatch(/\bdefaultParameters\s*:/)
      expect(source).not.toMatch(/\bparameterSchema\s*:/)
      expect(source).not.toMatch(/\bcapabilities\s*:/)
    })
  }
})
