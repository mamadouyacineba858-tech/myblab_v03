/**
 * visualContract.test.js — MB-VIS-RENDER-010
 *
 * Verrouille le Physical Component Visual Contract :
 *  - forme et stabilité du contrat (sections A–L présentes) ;
 *  - source de lumière unique et cohérente ;
 *  - ombre de contact plafonnée (anti-halo) et colinéaire à la lumière ;
 *  - matériaux tokenisés (propriété physique, pas une couleur) ;
 *  - échelle ancrée aux dimensions canoniques RÉELLES (componentDefinitions.js
 *    non modifié) et couverture des 16 types enregistrés ;
 *  - contrat de backend (svg | raster | r3f) + résolution tolérante ;
 *  - contrat d'asset (webp + fallback, @1x/@3x, nommage) sans asset produit ;
 *  - budgets par backend (T9 conservé pour svg) ;
 *  - mode de capture déterministe ;
 *  - grille QA (15 critères, cible ≥ 4) ;
 *  - r3f réservé, AUCUNE dépendance 3D installée ;
 *  - le module est un contrat PUR : aucun import React / *Part.jsx /
 *    simulator/ / canvas/ / componentDefinitions.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import {
  CONTRACT_VERSION, VISUAL_CONTRACT,
  LIGHTING, CONTACT_SHADOW,
  SCALE, SCALE_REFERENCE, SCALE_AUDIT, FILL_FACTOR,
  MATERIALS, MATERIAL_FAMILIES,
  LEAD_ANCHORING,
  BACKENDS, BACKEND_STATUS, DEFAULT_BACKEND, isValidBackend, resolveBackend, resolvePresentation,
  ASSET_CONTRACT,
  RENDER_BUDGET,
  CAPTURE, CAPTURE_MODES, DEFAULT_CAPTURE_MODE, isDeterministicCapture,
  QA_CRITERIA, QA_TARGET_SCORE, QA_ZOOM_LEVELS, QA_ANTI_RULE,
  R3F_EXTENSION,
} from '../visualContract.js'

import { getComponentDef } from '../../config/componentDefinitions.js'
import { DEFAULT_REGISTRATIONS, getComponentPresentation } from '../defaultRegistrations.js'
import { createDefaultVisualizationManager } from '../factory.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MODULE_PATH = resolve(__dirname, '../visualContract.js')
const FRONTEND_PKG = resolve(__dirname, '../../../package.json')

function magnitude(v) { return Math.hypot(v.x, v.y) }

describe('MB-VIS-RENDER-010 — forme et stabilité du contrat', () => {
  it('expose une version stable et un agrégat gelé', () => {
    expect(CONTRACT_VERSION).toBe('1.0.0-RENDER-010')
    expect(Object.isFrozen(VISUAL_CONTRACT)).toBe(true)
    expect(VISUAL_CONTRACT.version).toBe(CONTRACT_VERSION)
  })

  it('couvre les 12 sections A–L du ticket', () => {
    for (const k of [
      'lighting', 'contactShadow', 'scale', 'materials', 'leadAnchoring',
      'backends', 'asset', 'renderBudget', 'capture', 'qa', 'r3fExtension',
    ]) {
      expect(VISUAL_CONTRACT[k], `section ${k}`).toBeTruthy()
    }
  })
})

describe('C — Lighting Contract : source unique et cohérente', () => {
  it('la lumière clé est un vecteur unitaire orienté haut-gauche', () => {
    expect(magnitude(LIGHTING.keyLight.fromDirection)).toBeCloseTo(1, 3)
    expect(LIGHTING.keyLight.fromDirection.x).toBeLessThan(0) // gauche
    expect(LIGHTING.keyLight.fromDirection.y).toBeLessThan(0) // haut (y vers le bas)
  })

  it('shadowDirection est unitaire, bas-droite, et exactement opposée à la lumière', () => {
    expect(magnitude(LIGHTING.shadowDirection)).toBeCloseTo(1, 3)
    expect(LIGHTING.shadowDirection.x).toBeGreaterThan(0)
    expect(LIGHTING.shadowDirection.y).toBeGreaterThan(0)
    expect(LIGHTING.shadowDirection.x).toBeCloseTo(-LIGHTING.keyLight.fromDirection.x, 6)
    expect(LIGHTING.shadowDirection.y).toBeCloseTo(-LIGHTING.keyLight.fromDirection.y, 6)
  })
})

describe('D — Contact Shadow Contract : contact, pas décoration', () => {
  it('opacité ≤ maxIntensity ≤ 0.32 (plafond dur anti-halo)', () => {
    expect(CONTACT_SHADOW.opacity).toBeLessThanOrEqual(CONTACT_SHADOW.maxIntensity)
    expect(CONTACT_SHADOW.maxIntensity).toBeLessThanOrEqual(0.32)
    expect(CONTACT_SHADOW.blur).toBeGreaterThan(0)
    expect(CONTACT_SHADOW.spread).toBeGreaterThan(0)
  })

  it('le décalage est colinéaire à shadowDirection (même signe, produit croisé ≈ 0)', () => {
    const o = CONTACT_SHADOW.offset
    const d = LIGHTING.shadowDirection
    expect(Math.sign(o.x)).toBe(Math.sign(d.x))
    expect(Math.sign(o.y)).toBe(Math.sign(d.y))
    expect(o.x * d.y - o.y * d.x).toBeCloseTo(0, 5)
  })

  it('documente les anti-patterns interdits', () => {
    expect(CONTACT_SHADOW.antiPatterns).toEqual(
      expect.arrayContaining(['halo', 'bordure-noire'])
    )
    expect(CONTACT_SHADOW.anchor).toBe('silhouette-bottom')
  })
})

describe('E — Physical Scale Contract : ancré aux dimensions canoniques réelles', () => {
  it('canvasUnitsPerMm > 0 et marqué provisoire (à confirmer par prototype)', () => {
    expect(SCALE.canvasUnitsPerMm).toBeGreaterThan(0)
    expect(SCALE.provisional).toBe(true)
    expect(SCALE.confirmBy).toMatch(/PROTOTYPE/)
  })

  it('SCALE_REFERENCE couvre exactement les 16 types enregistrés', () => {
    const registered = DEFAULT_REGISTRATIONS.map((e) => e.type).sort()
    const referenced = SCALE_REFERENCE.map((e) => e.type).sort()
    expect(referenced).toEqual(registered)
  })

  it('chaque box de SCALE_REFERENCE = getComponentDef(type).width/height EXACTEMENT', () => {
    for (const entry of SCALE_REFERENCE) {
      const def = getComponentDef(entry.type)
      expect(def, `def ${entry.type}`).toBeTruthy()
      expect(entry.box, `box ${entry.type}`).toEqual([def.width, def.height])
    }
  })

  it('l\'audit d\'échelle constate la non-uniformité (facteur ~5) sans corriger les dimensions', () => {
    expect(SCALE_AUDIT.finding).toBe('boites-canoniques-non-mutuellement-a-echelle')
    const [lo, hi] = SCALE_AUDIT.impliedUnitsPerMmRange
    expect(hi / lo).toBeGreaterThan(3)
    expect(SCALE_AUDIT.underScaled).toContain('ARDUINO')
    expect(SCALE_AUDIT.resolution).toMatch(/hors-perimetre/)
  })

  it('FILL_FACTOR : fractions dans ]0,1]', () => {
    for (const [k, v] of Object.entries(FILL_FACTOR)) {
      expect(v, k).toBeGreaterThan(0)
      expect(v, k).toBeLessThanOrEqual(1)
    }
  })
})

describe('B — Material Tokens : propriété physique, pas une couleur', () => {
  const REQUIRED = [
    'METAL_LEAD', 'METAL_CHROME', 'METAL_BRUSHED', 'COPPER', 'BRASS',
    'PLASTIC_MATTE', 'PLASTIC_GLOSSY', 'CERAMIC', 'GLASS', 'LENS', 'EPOXY_RESIN', 'PCB',
  ]

  it('les 12 familles de matériaux requises sont présentes', () => {
    expect(Object.keys(MATERIALS).sort()).toEqual([...REQUIRED].sort())
  })

  it('chaque matériau décrit family / roughness / specular / highlight — jamais une couleur hex nue', () => {
    for (const [name, m] of Object.entries(MATERIALS)) {
      expect(typeof m, name).toBe('object')
      expect(MATERIAL_FAMILIES, `${name}.family`).toContain(m.family)
      expect(m.roughness, `${name}.roughness`).toBeGreaterThanOrEqual(0)
      expect(m.roughness, `${name}.roughness`).toBeLessThanOrEqual(1)
      expect(m.specular, `${name}.specular`).toBeTruthy()
      expect(m.highlight, `${name}.highlight`).toBeTruthy()
      // aucune valeur du token n'est une couleur hex « nue » (#rrggbb)
      for (const v of Object.values(m)) {
        if (typeof v === 'string') expect(v, `${name} valeur "${v}"`).not.toMatch(/^#[0-9a-fA-F]{3,8}$/)
      }
    }
  })
})

describe('F — Pin / Lead Anchoring Contract', () => {
  it('ancre les leads sur getPinPresentationPosition, sans recalcul par zoom', () => {
    expect(LEAD_ANCHORING.source).toMatch(/getPinPresentationPosition/)
    expect(LEAD_ANCHORING.derivedFrom).toMatch(/componentDefinitions\.js/)
    expect(LEAD_ANCHORING.tolerancePx).toBeGreaterThan(0)
    expect(LEAD_ANCHORING.tolerancePx).toBeLessThanOrEqual(1)
    expect(LEAD_ANCHORING.zoomBehaviour).toMatch(/aucun recalcul par zoom/)
    expect(LEAD_ANCHORING.zoomLevelsChecked).toEqual([0.5, 1, 2])
  })
})

describe('G — Backend Contract', () => {
  it('trois backends : svg (existant) / raster (cible EXP3) / r3f (réservé EXP5)', () => {
    expect(BACKENDS).toEqual({ SVG: 'svg', RASTER: 'raster', R3F: 'r3f' })
    expect(BACKEND_STATUS.svg.status).toBe('existing')
    expect(BACKEND_STATUS.raster.status).toBe('target')
    expect(BACKEND_STATUS.r3f.status).toBe('reserved')
    expect(DEFAULT_BACKEND).toBe('svg')
  })

  it('isValidBackend / resolveBackend sont tolérants et rétrocompatibles', () => {
    expect(isValidBackend('svg')).toBe(true)
    expect(isValidBackend('raster')).toBe(true)
    expect(isValidBackend('r3f')).toBe(true)
    expect(isValidBackend('bogus')).toBe(false)
    expect(resolveBackend(undefined)).toBe('svg')
    expect(resolveBackend(null)).toBe('svg')
    expect(resolveBackend({})).toBe('svg')
    expect(resolveBackend({ backend: 'bogus' })).toBe('svg')
    expect(resolveBackend({ backend: 'raster' })).toBe('raster')
    expect(resolveBackend({ backend: 'r3f' })).toBe('r3f')
  })

  it('MB-VIS-INDUSTRIAL-001 — resolvePresentation dérive backend / bareBody / markerless sans couplage par type', () => {
    // entrée absente -> tout par défaut (svg, habillage + marqueurs)
    expect(resolvePresentation(undefined)).toEqual({ backend: 'svg', bareBody: false, markerless: false })
    expect(resolvePresentation({})).toEqual({ backend: 'svg', bareBody: false, markerless: false })
    // backend raster -> bareBody + markerless dérivés true
    expect(resolvePresentation({ backend: 'raster' })).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    // backend svg mais drapeaux explicites (renderer SVG qui dessine son propre fond)
    expect(resolvePresentation({ bareBody: true, markerless: true })).toEqual({ backend: 'svg', bareBody: true, markerless: true })
    // un backend raster peut ré-activer explicitement l'habillage / le marqueur
    expect(resolvePresentation({ backend: 'raster', bareBody: false })).toEqual({ backend: 'raster', bareBody: false, markerless: true })
    expect(Object.isFrozen(resolvePresentation({}))).toBe(true)
  })

  it('MB-VIS-INDUSTRIAL-001 — la présentation est réellement branchée dans le RendererRegistry / VisualizationManager', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    // le registre porte la déclaration `visual` -> getBackend / getPresentation
    expect(manager.getBackend('RESISTOR')).toBe('raster')
    expect(manager.getBackend('LED')).toBe('raster')
    expect(manager.getBackend('CAPACITOR')).toBe('raster')
    expect(manager.getBackend('LDR')).toBe('raster')
    expect(manager.getBackend('THERMISTOR')).toBe('raster')
    expect(manager.getBackend('DC_MOTOR')).toBe('raster')
    expect(manager.getBackend('BUTTON')).toBe('raster')
    expect(manager.getBackend('BUTTON_LATCHING')).toBe('raster')
    expect(manager.getBackend('BUZZER')).toBe('raster')
    expect(manager.getBackend('POTENTIOMETER')).toBe('raster')
    expect(manager.getBackend('POWER')).toBe('svg')
    expect(manager.getPresentation('RESISTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('LED')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('CAPACITOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('LDR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('THERMISTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('DC_MOTOR')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('BUTTON')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('BUTTON_LATCHING')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('BUZZER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('POTENTIOMETER')).toEqual({ backend: 'raster', bareBody: true, markerless: true })
    expect(manager.getPresentation('POWER')).toEqual({ backend: 'svg', bareBody: false, markerless: false })
  })

  it('MB-VIS-INDUSTRIAL-001 — accesseur statique getComponentPresentation == manager (même source, même résultat)', () => {
    const manager = createDefaultVisualizationManager(DEFAULT_REGISTRATIONS)
    for (const { type } of DEFAULT_REGISTRATIONS) {
      expect(getComponentPresentation(type)).toEqual(manager.getPresentation(type))
    }
  })

  it('MB-VIS — composants raster déclarés à ce jour : RESISTOR (001C) + DIODE (002) + LED (003) + CAPACITOR (004) + LDR (005) + THERMISTOR (006) + DC_MOTOR (007) + BUTTON + BUTTON_LATCHING (008) + BUZZER (031) + POTENTIOMETER (032) ; tous les autres restent svg par défaut', () => {
    const rasterTypes = DEFAULT_REGISTRATIONS
      .map((e) => e.type)
      .filter((t) => getComponentPresentation(t).backend === 'raster')
    expect(rasterTypes.slice().sort()).toEqual(['BUTTON', 'BUTTON_LATCHING', 'BUZZER', 'CAPACITOR', 'DC_MOTOR', 'DIODE', 'LDR', 'LED', 'POTENTIOMETER', 'RESISTOR', 'THERMISTOR'])
    const rasterSet = new Set(rasterTypes)
    for (const { type } of DEFAULT_REGISTRATIONS) {
      if (rasterSet.has(type)) continue
      expect(getComponentPresentation(type).backend, `${type} doit rester svg`).toBe('svg')
    }
  })
})

describe('H — Asset Contract : défini, aucun asset produit', () => {
  it('WebP + fallback PNG + alpha, résolutions @1x et @3x', () => {
    expect(ASSET_CONTRACT.format).toEqual({ primary: 'webp', fallback: 'png', alpha: true })
    expect(ASSET_CONTRACT.resolutions.map((r) => r.key)).toEqual(['1x', '3x'])
  })

  it('gabarit de nommage paramétré par type / état / résolution / extension', () => {
    for (const token of ['{typeKebab}', '{state}', '{res}', '{ext}']) {
      expect(ASSET_CONTRACT.naming).toContain(token)
    }
    expect(ASSET_CONTRACT.root).toMatch(/frontend\/public\//)
  })

  it('la pipeline précise qu\'AUCUN asset n\'est produit dans RENDER-010', () => {
    expect(ASSET_CONTRACT.productionPipeline.note).toMatch(/AUCUN asset produit dans MB-VIS-RENDER-010/)
  })
})

describe('I — Rendering Budget', () => {
  it('svg : T9 conservé (< 40 primitives)', () => {
    expect(RENDER_BUDGET.svg.maxPrimitives).toBe(40)
    expect(RENDER_BUDGET.svg.primitiveSelector).toMatch(/rect, circle, line, path, ellipse, polygon/)
  })

  it('raster : budgets provisoires à confirmer par prototype', () => {
    expect(RENDER_BUDGET.raster.provisional).toBe(true)
    expect(RENDER_BUDGET.raster.confirmBy).toMatch(/PROTOTYPE/)
    expect(RENDER_BUDGET.raster.maxWeightKbPerVariantSimple).toBeGreaterThan(0)
    expect(RENDER_BUDGET.raster.maxWeightKbPerVariantComplex).toBeGreaterThan(RENDER_BUDGET.raster.maxWeightKbPerVariantSimple)
    expect(RENDER_BUDGET.raster.resolutions).toBe(2)
  })

  it('r3f : réservé', () => {
    expect(RENDER_BUDGET.r3f.status).toBe('reserved')
  })
})

describe('J — Deterministic Capture Contract', () => {
  it('deux modes ; interactif par défaut ; capture fige animation/aléatoire/temps', () => {
    expect(CAPTURE_MODES).toEqual({ INTERACTIVE: 'interactive', DETERMINISTIC: 'deterministic' })
    expect(DEFAULT_CAPTURE_MODE).toBe('interactive')
    expect(CAPTURE.disables).toEqual(expect.arrayContaining(['animation', 'random', 'time-based-effect']))
    expect(CAPTURE.keepsT8).toBe(true)
    expect(isDeterministicCapture('deterministic')).toBe(true)
    expect(isDeterministicCapture('interactive')).toBe(false)
  })
})

describe('K — Visual QA Contract', () => {
  it('15 critères, cible ≥ 4/5, zooms 0.5×/1×/2×, anti-règle « pas juste des gradients »', () => {
    expect(QA_CRITERIA).toHaveLength(15)
    expect(QA_CRITERIA).toEqual(expect.arrayContaining([
      'silhouette identifiable', 'contact avec surface', 'lumiere coherente', 'aucun changement fonctionnel',
    ]))
    expect(QA_TARGET_SCORE).toBe(4)
    expect(QA_ZOOM_LEVELS).toEqual([0.5, 1, 2])
    expect(QA_ANTI_RULE).toMatch(/gradients/)
  })
})

describe('L — Future R3F extension : documenté, non implémenté', () => {
  it('r3f réservé EXP5, point d\'extension = RendererRegistry inchangé, aucune dépendance', () => {
    expect(R3F_EXTENSION.status).toBe('reserved-exp5')
    expect(R3F_EXTENSION.pointOfExtension).toMatch(/RendererRegistry.*INCHANGE/)
    expect(R3F_EXTENSION.dependencies).toMatch(/aucune/)
    expect(R3F_EXTENSION.untouched).toEqual(expect.arrayContaining(['Pin overlays HTML']))
  })
})

describe('MB-VIS-RENDER-010 — garde-fous : contrat PUR, aucun backend 3D installé', () => {
  const source = readFileSync(MODULE_PATH, 'utf-8')

  it('le module n\'importe rien de React / *Part.jsx / simulator/ / canvas/ / componentDefinitions', () => {
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(codeOnly).not.toMatch(/^\s*import\s+/m) // aucun import runtime : contrat de données pur
  })

  it('le module n\'importe pas three / @react-three (aucun require / import de dépendance 3D)', () => {
    expect(source).not.toMatch(/from\s+["'](three|@react-three\/[a-z-]+)["']/)
    expect(source).not.toMatch(/require\(\s*["'](three|@react-three\/[a-z-]+)["']\s*\)/)
  })

  it('aucune dépendance 3D dans frontend/package.json (three / @react-three/*)', () => {
    const pkg = JSON.parse(readFileSync(FRONTEND_PKG, 'utf-8'))
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    for (const name of Object.keys(all)) {
      expect(name).not.toBe('three')
      expect(name.startsWith('@react-three/')).toBe(false)
    }
  })
})
