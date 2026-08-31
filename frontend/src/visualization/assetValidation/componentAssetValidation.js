/**
 * componentAssetValidation.js — MB-VIS-PROTOTYPE-001A
 *
 * Harnais GÉNÉRIQUE de validation d'asset raster de composant.
 * Réutilisé par MB-VIS-PROTOTYPE-001B (RESISTOR), -002 (LED), -003 (DC MOTOR)
 * pour juger un asset livré à l'identique.
 *
 * Ce module NE produit AUCUN asset, NE rastérise rien, NE dessine rien.
 * Il DÉRIVE des attendus depuis les seules sources de vérité —
 *   `config/componentDefinitions.js`  (dimensions + pins)
 *   `visualization/visualContract.js` (langage visuel, budgets, nommage)
 * — et fournit une fonction PURE `validateComponentAsset(spec, probe)` qui
 * juge un `probe` (mesures d'un asset réel, fournies par 001B).
 *
 * Il n'importe rien de `simulator/`, `CircuitComponent.jsx`, `Pin.jsx`,
 * `registry.js`, `PartRenderer.jsx`. Il ne crée ni renderer, ni registre,
 * ni seconde source de vérité.
 */
import { getComponentDef } from '../../config/componentDefinitions.js'
import {
  ASSET_CONTRACT, RENDER_BUDGET, FILL_FACTOR, LIGHTING, CONTACT_SHADOW, CAPTURE,
} from '../visualContract.js'

/** UPPER_SNAKE -> kebab-case ("DC_MOTOR" -> "dc-motor"). */
export function typeToKebab(type) {
  return String(type).toLowerCase().replace(/_/g, '-')
}

/**
 * Dérive les attendus d'asset d'un type, sans redéfinir aucune valeur.
 * @param {string} type  ex. "RESISTOR"
 * @param {{ fillFactorKey?: string, states?: string[] }} [opts]
 * @returns {object} spec gelée
 */
export function deriveComponentAssetSpec(type, opts = {}) {
  const def = getComponentDef(type)
  if (!def) throw new Error(`[componentAssetValidation] type inconnu: ${type}`)

  const fillFactorKey = opts.fillFactorKey && FILL_FACTOR[opts.fillFactorKey] != null
    ? opts.fillFactorKey
    : 'DEFAULT'
  const states = Array.isArray(opts.states) && opts.states.length ? opts.states : ['default']
  const typeKebab = typeToKebab(type)
  const assetDir = `${ASSET_CONTRACT.root}/${typeKebab}`
  const exts = [ASSET_CONTRACT.format.primary, ASSET_CONTRACT.format.fallback]
  const resKeys = ASSET_CONTRACT.resolutions.map((r) => r.key)
  const maxKb = RENDER_BUDGET.raster.maxWeightKbPerVariantSimple

  const expectedFiles = []
  for (const state of states) {
    for (const res of resKeys) {
      for (const ext of exts) {
        expectedFiles.push(Object.freeze({
          state, res, ext,
          path: `${assetDir}/${typeKebab}.${state}.${res}.${ext}`,
          maxKb,
        }))
      }
    }
  }

  // Ancrage des leads : pour les types hors-LED, la position de présentation
  // du pin coïncide avec ses offsets dx/dy dans la boîte canonique
  // (getPinPresentationPosition() = cas générique). Source : getComponentDef.
  const pinAnchors = (def.pins || []).map((p) => Object.freeze({
    id: p.id, x: p.dx ?? 0, y: p.dy ?? 0,
  }))

  return Object.freeze({
    type,
    typeKebab,
    box: Object.freeze([def.width, def.height]),
    fillFactorKey,
    fillFactor: FILL_FACTOR[fillFactorKey],
    pinAnchors: Object.freeze(pinAnchors),
    leadAnchorTolerancePx: 0.75,
    lighting: LIGHTING,
    contactShadow: CONTACT_SHADOW,
    capture: CAPTURE,
    assetDir,
    states: Object.freeze([...states]),
    resolutions: Object.freeze([...resKeys]),
    formats: Object.freeze([...exts]),
    expectedFiles: Object.freeze(expectedFiles),
    budget: Object.freeze({
      maxKbPerVariant: maxKb,
      maxKbPerVariantComplex: RENDER_BUDGET.raster.maxWeightKbPerVariantComplex,
      maxVariants: RENDER_BUDGET.raster.maxVariants,
      maxResolutions: RENDER_BUDGET.raster.resolutions,
      maxDimensionPx: RENDER_BUDGET.raster.maxDimensionPx,
    }),
  })
}

const NAMING_RE = /([a-z0-9-]+)\/\1\.([a-z0-9-]+)\.(1x|3x)\.(webp|png)$/

function check(id, name, ok, detail) {
  return { id, name, ok: !!ok, detail: detail == null ? '' : String(detail) }
}

/**
 * Valide un asset réel contre sa spec. Fonction PURE.
 * @param {object} spec  résultat de deriveComponentAssetSpec()
 * @param {{
 *   files: Record<string, { exists?:boolean, bytes?:number, width?:number,
 *     height?:number, hasAlpha?:boolean, fullyOpaque?:boolean, sha256?:string }>,
 *   determinism?: Record<string, { sha256_a:string, sha256_b:string }>,
 * }} probe
 * @returns {{ ok:boolean, checks:Array<{id,name,ok,detail}> }}
 */
export function validateComponentAsset(spec, probe) {
  const checks = []
  const files = (probe && probe.files) || {}
  const get = (p) => files[p] || {}

  // A — existence
  const missing = spec.expectedFiles.filter((f) => !get(f.path).exists)
  checks.push(check('A', 'existence des fichiers attendus', missing.length === 0,
    missing.length ? `manquants: ${missing.map((f) => f.path).join(', ')}` : `${spec.expectedFiles.length} fichiers présents`))

  // G — nommage
  const badName = spec.expectedFiles.filter((f) => !NAMING_RE.test(f.path))
  checks.push(check('G', 'nommage {typeKebab}/{typeKebab}.{state}.{res}.{ext}', badName.length === 0,
    badName.length ? badName.map((f) => f.path).join(', ') : 'conforme'))

  // K — exactement 2 résolutions attendues
  checks.push(check('K', 'résolutions = [1x, 3x]',
    spec.resolutions.length === 2 && spec.resolutions.includes('1x') && spec.resolutions.includes('3x'),
    spec.resolutions.join(', ')))

  // F — nb de variantes (états) ≤ budget
  checks.push(check('F', 'nombre de variantes ≤ budget',
    spec.states.length <= spec.budget.maxVariants,
    `${spec.states.length} ≤ ${spec.budget.maxVariants}`))

  // D — alpha présent
  const noAlpha = spec.expectedFiles.filter((f) => get(f.path).exists && get(f.path).hasAlpha !== true)
  checks.push(check('D', 'transparence alpha présente', noAlpha.length === 0,
    noAlpha.length ? noAlpha.map((f) => f.path).join(', ') : 'alpha OK'))

  // I — fond non opaque
  const opaque = spec.expectedFiles.filter((f) => get(f.path).exists && get(f.path).fullyOpaque === true)
  checks.push(check('I', 'absence de fond opaque', opaque.length === 0,
    opaque.length ? opaque.map((f) => f.path).join(', ') : 'pas de fond cuit'))

  // E / J — poids ≤ budget
  const overBudget = spec.expectedFiles.filter((f) => {
    const b = get(f.path)
    return b.exists && typeof b.bytes === 'number' && b.bytes / 1024 > f.maxKb
  })
  checks.push(check('E/J', `poids ≤ ${spec.budget.maxKbPerVariant} Ko / variante`, overBudget.length === 0,
    overBudget.length
      ? overBudget.map((f) => `${f.path}=${(get(f.path).bytes / 1024).toFixed(1)}Ko`).join(', ')
      : 'sous budget'))

  // B/C — dimensions cohérentes + ≤ maxDimensionPx ; @3x = 3 × @1x (± 1 px)
  const dimIssues = []
  for (const state of spec.states) {
    for (const ext of spec.formats) {
      const a = get(`${spec.assetDir}/${spec.typeKebab}.${state}.1x.${ext}`)
      const c = get(`${spec.assetDir}/${spec.typeKebab}.${state}.3x.${ext}`)
      if (!a.exists || !c.exists) continue
      if (typeof a.width === 'number' && typeof c.width === 'number' && Math.abs(c.width - a.width * 3) > 1) {
        dimIssues.push(`${state}.${ext}: 3x.w(${c.width}) ≠ 3×1x.w(${a.width})`)
      }
      if (typeof a.height === 'number' && typeof c.height === 'number' && Math.abs(c.height - a.height * 3) > 1) {
        dimIssues.push(`${state}.${ext}: 3x.h(${c.height}) ≠ 3×1x.h(${a.height})`)
      }
      for (const [tag, m] of [['1x', a], ['3x', c]]) {
        const longest = Math.max(m.width || 0, m.height || 0)
        if (longest > spec.budget.maxDimensionPx) dimIssues.push(`${state}.${ext}.${tag}: ${longest}px > ${spec.budget.maxDimensionPx}px`)
      }
    }
  }
  checks.push(check('B/C', 'dimensions @1x/@3x cohérentes et ≤ maxDimensionPx', dimIssues.length === 0,
    dimIssues.length ? dimIssues.join(' ; ') : 'cohérentes'))

  // H — déterminisme (si fourni)
  if (probe && probe.determinism) {
    const drift = Object.entries(probe.determinism).filter(([, d]) => d.sha256_a !== d.sha256_b)
    checks.push(check('H', 'déterminisme : deux captures identiques (sha256)', drift.length === 0,
      drift.length ? drift.map(([p]) => p).join(', ') : 'hash identiques'))
  } else {
    checks.push(check('H', 'déterminisme', true, 'non fourni (à mesurer en 001B) — non bloquant ici'))
  }

  // L — garde anti-dérive : la spec reste ancrée aux dimensions canoniques
  const def = getComponentDef(spec.type)
  checks.push(check('L', 'boîte = getComponentDef().width/height',
    !!def && spec.box[0] === def.width && spec.box[1] === def.height,
    def ? `${spec.box[0]}×${spec.box[1]} == ${def.width}×${def.height}` : 'def introuvable'))

  const ok = checks.every((c) => c.ok)
  return { ok, checks }
}

/**
 * Attributs DOM cibles de l'<img> d'intégration expérimentale (§16 du ticket).
 * Le renderer réel les appliquera ; ici on les DÉRIVE pour la preuve DOM,
 * sans rien rendre ni modifier.
 */
export function integrationImgAttrs(spec, { src = '', srcset = '' } = {}) {
  return Object.freeze({
    src, srcset,
    width: spec.box[0],
    height: spec.box[1],
    draggable: false,
    alt: '',
    'aria-hidden': 'true',
    style: Object.freeze({ width: '100%', height: '100%', pointerEvents: 'none' }),
  })
}

export const RESISTOR_ASSET_SPEC = deriveComponentAssetSpec('RESISTOR', { fillFactorKey: 'AXIAL_LEADED' })

export default { deriveComponentAssetSpec, validateComponentAsset, integrationImgAttrs, typeToKebab, RESISTOR_ASSET_SPEC }
