/**
 * SlideSwitchLeadContinuity.test.jsx — A3-SW3-R1 "Slide Switch Lead/Body
 * Visual Continuity" (Founder Canvas FAIL : une patte paraissait détachée
 * du corps en état RIGHT).
 *
 * Cause racine (cf. commentaire SlideSwitchPart.jsx) : les deux fichiers
 * sources `slide-switch.left.1x.png` / `slide-switch.right.1x.png`
 * (INCHANGÉS, jamais édités par ce ticket) cadrent le boîtier avec un
 * décalage horizontal d'environ 12px entre les deux états. Les 3
 * PhysicalContacts (throwA/common/throwB, dx 12/36/60) et les racines de
 * pattes fonctionnelles (assemblyProfiles.js, INCHANGÉ) restent verticaux et
 * FIXES (même convention que tout le catalogue — aucun lead diagonal) :
 * sans correction, throwA tombe hors de la silhouette du boîtier RIGHT.
 * `RIGHT_IMAGE_CORRECTION_PX` (SlideSwitchPart.jsx) recale UNIQUEMENT le
 * RENDU (transform CSS) de l'asset RIGHT, jamais le fichier ni les contacts.
 *
 *  R1-01 : géométrie électrique Slide inchangée (dx 12/36/60, dy 44).
 *  R1-02 : 3 contacts inchangés (throwA/common/throwB).
 *  R1-03 : breadboardInsertable:true conservé (A3-SW3, non régressé).
 *  R1-04 : assembly profile présent, bodyClip.bottom=17, 3 leads déclarés.
 *  R1-05 : 3 pattes fonctionnelles (AssemblyLeadsLayer) rendues sur le
 *          pipeline réel, quel que soit l'état.
 *  R1-06 : correctif de continuité appliqué UNIQUEMENT en état RIGHT
 *          (translateX négatif), ABSENT en état LEFT — verrouille le
 *          correctif sans changer l'image ni les contacts.
 *  R1-07 : état LEFT non régressé (aria-label, classes, asset).
 *  R1-08 : état RIGHT non régressé (aria-label, classes, asset).
 *  R1-09 : placement Breadboard non régressé (toujours valid:true).
 *  R1-10 : DIP_SWITCH non modifié / non régressé par ce correctif.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { SlideSwitchPart } from '../SlideSwitchPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { getAssemblyProfile } from '../../../visualization/assemblyProfiles.js'
import { computeBreadboardPlacement } from '../../../utils/breadboardPlacementAdapter.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('A3-SW3-R1 — R1-01/02/03 : géométrie électrique SLIDE_SWITCH inchangée', () => {
  it('R1-01/R1-02 — 3 contacts throwA(12,44)/common(36,44)/throwB(60,44)', () => {
    const def = getComponentDef('SLIDE_SWITCH')
    expect(def.pins.map((p) => p.id)).toEqual(['throwA', 'common', 'throwB'])
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.throwA).toEqual([12, 44])
    expect(byId.common).toEqual([36, 44])
    expect(byId.throwB).toEqual([60, 44])
  })

  it('R1-03 — breadboardInsertable:true conservé (A3-SW3)', () => {
    const def = getComponentDef('SLIDE_SWITCH')
    for (const p of def.pins) {
      expect(p.wireConnectable).toBe(true)
      expect(p.breadboardInsertable).toBe(true)
    }
  })
})

describe('A3-SW3-R1 — R1-04 : assembly profile SLIDE_SWITCH', () => {
  it('profil présent, bodyClip.bottom=17, 3 leads déclarés à l\'aplomb des contacts', () => {
    const profile = getAssemblyProfile('SLIDE_SWITCH')
    expect(profile).not.toBeNull()
    expect(profile.bodyClip).toEqual({ bottom: 17 })
    expect(Object.keys(profile.leads).sort()).toEqual(['common', 'throwA', 'throwB'])
    expect(profile.leads.throwA.root.dx).toBe(12)
    expect(profile.leads.common.root.dx).toBe(36)
    expect(profile.leads.throwB.root.dx).toBe(60)
  })
})

describe('A3-SW3-R1 — R1-06 : correctif de continuité appliqué uniquement en RIGHT', () => {
  it('état LEFT : aucun transform correctif sur l\'<img>', () => {
    const { container } = render(<SlideSwitchPart state="left" />)
    const img = container.querySelector('img')
    expect(img.style.transform).toBeFalsy()
  })

  it('état RIGHT : translateX négatif appliqué (recale le cadrage du boîtier photographié)', () => {
    const { container } = render(<SlideSwitchPart state="right" />)
    const img = container.querySelector('img')
    expect(img.style.transform).toMatch(/^translateX\(-\d+(\.\d+)?px\)$/)
  })

  it('le fichier source SlideSwitchPart.jsx documente la cause (audit pixel) sans modifier les assets ni les contacts', () => {
    const src = readFileSync(resolve(__dirname, '../SlideSwitchPart.jsx'), 'utf-8')
    expect(src).toMatch(/RIGHT_IMAGE_CORRECTION_PX/)
    // Le correctif est un ajustement de PRÉSENTATION (transform CSS) : ce
    // fichier ne doit référencer aucun nouveau chemin d'asset ni toucher
    // aux contacts électriques.
    expect(src).not.toMatch(/slide-switch\.(left|right)-corrected/)
  })
})

describe('A3-SW3-R1 — R1-07/R1-08 : états LEFT/RIGHT non régressés', () => {
  it('R1-07 — LEFT : classe, aria-label, asset inchangés', () => {
    const { container } = render(<SlideSwitchPart state="left" />)
    const root = container.querySelector('.part-slide-switch')
    expect(root.className).toMatch(/is-left/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur à glissière : position gauche')
    expect(container.querySelector('img').getAttribute('src')).toContain('slide-switch.left.')
  })

  it('R1-08 — RIGHT : classe, aria-label, asset inchangés (seul le rendu CSS de l\'image est recalé)', () => {
    const { container } = render(<SlideSwitchPart state="right" />)
    const root = container.querySelector('.part-slide-switch')
    expect(root.className).toMatch(/is-right/)
    expect(root.getAttribute('aria-label')).toBe('Interrupteur à glissière : position droite')
    expect(container.querySelector('img').getAttribute('src')).toContain('slide-switch.right.')
  })
})

describe('A3-SW3-R1 — R1-05 : pipeline réel — 3 pattes fonctionnelles rendues (LEFT et RIGHT)', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('LEFT (état initial) : 3 <line> d\'assembly leads rendues, aucune ne manque', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SLIDE_SWITCH', 0, 0) })
    expect(api.components[0].state).toBe('left')
    const leads = container.querySelectorAll('line.assembly-leads__lead')
    expect(leads.length).toBe(3)
  })

  it('RIGHT (après toggle réel) : toujours 3 <line> d\'assembly leads rendues', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('SLIDE_SWITCH', 0, 0) })
    const root = container.querySelector('.part-slide-switch')
    act(() => { fireEvent.click(root) })
    expect(api.components[0].state).toBe('right')
    const leads = container.querySelectorAll('line.assembly-leads__lead')
    expect(leads.length).toBe(3)
    // Les racines/cibles des pattes restent identiques à LEFT (aucune
    // dépendance à `state` dans assemblyProfiles.js/assemblyGeometry.js) :
    // seule l'image (transform CSS) diffère entre les deux états.
    const xs = [...leads].map((l) => l.getAttribute('x2')).sort()
    expect(xs).toEqual(['12', '36', '60'])
  })
})

describe('A3-SW3-R1 — R1-09 : placement Breadboard non régressé', () => {
  it('SLIDE_SWITCH reste snap-able et valid sur breadboard, dans les deux états', () => {
    const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const result = computeBreadboardPlacement(breadboard, 'SLIDE_SWITCH', { x: 3, y: 5 }, [])
    expect(result.valid).toBe(true)
    expect(result.holes).toHaveLength(3)
  })
})

describe('A3-SW3-R1 — R1-10 : DIP_SWITCH non modifié par ce correctif', () => {
  it('géométrie et flag DIP_SWITCH inchangés (A3-SW3, non touchés par R1)', () => {
    const def = getComponentDef('DIP_SWITCH')
    expect(def.pins.map((p) => p.dx)).toEqual([14, 26, 38, 50, 62, 74, 86, 98])
    for (const p of def.pins) expect(p.breadboardInsertable).toBe(true)
  })

  it('aucun assembly profile ajouté pour DIP_SWITCH par ce ticket (décision A3-SW3 documentée, inchangée)', () => {
    expect(getAssemblyProfile('DIP_SWITCH')).toBeNull()
  })
})
