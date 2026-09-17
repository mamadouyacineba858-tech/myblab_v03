/**
 * tiltSensorA7C4R1.test.js — Ticket A7-C4-TILT-R1 (correctif Canvas FAIL
 * Founder : pattes DO/GND du Tilt Sensor débordant visuellement sous le
 * point d'insertion breadboard).
 *
 * Correction MÉCANIQUE/PRÉSENTATION PURE, localisée à
 * `visualization/assemblyProfiles.js` (racines + bodyClip) : AUCUN
 * changement de PhysicalContacts, AUCUNE modification du raster Founder
 * PASS, AUCUNE modification du modèle électrique/simulation/contrat TILT.
 *
 * Couvre R1-01 à R1-10 du ticket §10.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { getComponentDef } from '../config/componentDefinitions.js'
import { resolveContacts } from '../utils/contactModel.js'
import { BREADBOARD_PITCH, resolveComponentContactHoles } from '../utils/breadboardGeometry.js'
import { computeBreadboardPlacement } from '../utils/breadboardPlacementAdapter.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'
import { resolveAssemblyGeometry } from '../utils/assemblyGeometry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TILT_DIR = resolve(__dirname, '../../public/assets/components/tilt-sensor')

function byPinOf(def, id) {
  return def.pins.find((p) => p.id === id)
}

describe('A7-C4-TILT-R1 — R1-01/R1-02 : PhysicalContacts INCHANGÉS, pitch 12 px INCHANGÉ', () => {
  const def = getComponentDef('TILT_SENSOR')
  const byPin = Object.fromEntries(def.pins.map((p) => [p.id, p]))

  it('R1-01 — DO(29,108) / GND(41,108), strictement identiques à A7-C4-TILT', () => {
    expect(resolveContacts(byPin.DO)[0]).toMatchObject({ id: 'DO', dx: 29, dy: 108 })
    expect(resolveContacts(byPin.GND)[0]).toMatchObject({ id: 'GND', dx: 41, dy: 108 })
  })

  it('R1-02 — entraxe GND.dx - DO.dx = 12 = 1×BREADBOARD_PITCH', () => {
    expect(BREADBOARD_PITCH).toBe(12)
    const [doC, gndC] = ['DO', 'GND'].map((id) => resolveContacts(byPin[id])[0])
    expect(gndC.dx - doC.dx).toBe(12)
    expect(gndC.dy).toBe(doC.dy)
  })
})

describe('A7-C4-TILT-R1 — R1-03/R1-04/R1-05/R1-06 : résolveurs breadboard réels, aucune régression fonctionnelle', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
  const def = getComponentDef('TILT_SENSOR')
  // Même origine que A7-C4-TILT (DO/GND dx ≡ 5 mod 12 ; ox=7 aligne sur la
  // grille ; dy=108 ≡ 0 mod 12, oy=0 tombe sur la rangée 9, première rangée
  // valide de la bande basse).
  const origin = { x: 7, y: 0 }

  it('R1-03 — resolveComponentContactHoles retourne toujours 2 trous DISTINCTS', () => {
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, origin)
    expect(results).toHaveLength(2)
    expect(allResolved).toBe(true)
    const [doR, gndR] = results
    expect(doR.hole).not.toBeNull()
    expect(gndR.hole).not.toBeNull()
    expect(`${doR.hole.column}:${doR.hole.row}`).not.toBe(`${gndR.hole.column}:${gndR.hole.row}`)
  })

  it('R1-04 — computeBreadboardPlacement reste valid:true', () => {
    const result = computeBreadboardPlacement(breadboard, 'TILT_SENSOR', origin, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.holes).toHaveLength(2)
    expect(result.valid).toBe(true)
  })

  it('R1-05 — resolveAssemblyGeometry reste inserted:true', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'TILT_SENSOR', x: origin.x, y: origin.y }, breadboard)
    expect(g.inserted).toBe(true)
    expect(g.contacts).toHaveLength(2)
  })

  it('R1-06 — les targets d\'assemblage restent les PhysicalContacts réels (component.{x,y} + contact.{dx,dy})', () => {
    const g = resolveAssemblyGeometry({ uid: 'x1', type: 'TILT_SENSOR', x: origin.x, y: origin.y }, breadboard)
    const byPinId = Object.fromEntries(g.contacts.map((c) => [c.pinId, c]))
    expect(byPinId.DO.target).toEqual({ x: origin.x + 29, y: origin.y + 108 })
    expect(byPinId.GND.target).toEqual({ x: origin.x + 41, y: origin.y + 108 })
  })
})

describe('A7-C4-TILT-R1 — R1-07 : géométrie visuelle corrigée — la patte ne prolonge plus au-delà du point d\'insertion', () => {
  const def = getComponentDef('TILT_SENSOR')

  it('cause du Canvas FAIL éliminée à la racine : root.dy < target.dy (sens racine→trou correct, jamais inversé)', () => {
    const profile = getAssemblyProfile('TILT_SENSOR')
    for (const id of ['DO', 'GND']) {
      const contact = resolveContacts(byPinOf(def, id))[0]
      expect(profile.leads[id].root.dy, `${id} root.dy doit être STRICTEMENT au-dessus (< ) du PhysicalContact`).toBeLessThan(contact.dy)
    }
  })

  it('bodyClip.bottom masque désormais la totalité de la patte cuite AU-DELÀ (et au niveau) de la racine — canonical height 120 - bodyClip.bottom === root.dy', () => {
    const profile = getAssemblyProfile('TILT_SENSOR')
    expect(profile.bodyClip).toBeTruthy()
    const clipLine = 120 - profile.bodyClip.bottom
    expect(clipLine).toBe(profile.leads.DO.root.dy)
    expect(clipLine).toBe(profile.leads.GND.root.dy)
  })

  it('la zone clippée (sous la racine) couvre bien la pointe réelle mesurée du raster (y=117, cf. R0 pixel-probe) : rien de la patte cuite ne reste visible au-delà du trou', () => {
    const profile = getAssemblyProfile('TILT_SENSOR')
    const clipLine = 120 - profile.bodyClip.bottom
    const MEASURED_LEG_TIP_Y = 117
    expect(clipLine).toBeLessThan(MEASURED_LEG_TIP_Y)
  })

  it('le segment root→target dessiné par AssemblyLeadsLayer reste entièrement dans la zone clippée (visible), et s\'arrête PILE au trou (rien après)', () => {
    const profile = getAssemblyProfile('TILT_SENSOR')
    const clipLine = 120 - profile.bodyClip.bottom
    const def2 = getComponentDef('TILT_SENSOR')
    for (const id of ['DO', 'GND']) {
      const root = profile.leads[id].root
      const contact = resolveContacts(byPinOf(def2, id))[0]
      expect(root.dy).toBeGreaterThanOrEqual(clipLine)
      expect(contact.dy).toBeGreaterThan(clipLine)
    }
  })
})

describe('A7-C4-TILT-R1 — R1-08 : raster Founder PASS byte-for-byte INCHANGÉ', () => {
  it('les 4 hashes SHA-256 des assets correspondent exactement à ASSET-INTEGRITY.json (aucune régénération)', () => {
    const raw = JSON.parse(readFileSync(resolve(TILT_DIR, 'ASSET-INTEGRITY.json'), 'utf-8'))
    const files = raw.files ?? {}
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(4)
    for (const [file, entry] of Object.entries(files)) {
      const full = resolve(TILT_DIR, file)
      expect(existsSync(full), file).toBe(true)
      const buf = readFileSync(full)
      expect(buf.length, `${file} bytes`).toBe(entry.bytes)
      const hash = createHash('sha256').update(buf).digest('hex')
      expect(hash, `${file} sha256`).toBe(entry.sha256)
    }
  })
})

describe('A7-C4-TILT-R1 — R1-09 : aucun fichier de simulation protégé modifié', () => {
  it('le littéral "TILT_SENSOR"/"TILT" est absent des fichiers protégés du ticket R1 §9', () => {
    const protectedFiles = [
      '../simulator/resolution.js',
      '../simulator/simulationRuntimeIntegration.js',
      '../simulator/preparation.js',
      '../simulator/engine.js',
      '../simulator/dcContributionRegistry.js',
    ]
    for (const rel of protectedFiles) {
      const full = resolve(__dirname, rel)
      if (!existsSync(full)) continue
      const src = readFileSync(full, 'utf-8')
      expect(src, rel).not.toMatch(/TILT_SENSOR/)
      expect(src, rel).not.toMatch(/\bTILT\b/)
    }
  })
})
