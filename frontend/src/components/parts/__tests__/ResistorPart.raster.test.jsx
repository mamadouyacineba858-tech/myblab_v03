/**
 * ResistorPart.raster.test.jsx — MB-VIS-PROTOTYPE-001C + MB-L1-PROP-004
 *
 * Prouve le branchement réel de l'asset raster RESISTOR NEUTRE (`base.*`,
 * MB-L1-PROP-004) et de la projection dynamique du code couleur dérivée de
 * `parameters.resistance` :
 *  1. RESISTOR rend un <img> ;
 *  2. src / srcset pointent vers les assets `resistor.base.*` sous
 *     /assets/components/resistor/ (les `resistor.default.*` historiques
 *     restent inchangés sur disque mais ne sont plus référencés par ce
 *     renderer) ;
 *  3. draggable = false ;
 *  4. pointer-events: none (image ET couche de bandes) ;
 *  5. aucun vestige de l'ancien renderer SVG (<svg>/<line>/<rect>/<defs>/gradient) ;
 *  6. la boîte logique reste 84×28 (dimensions dérivées de getComponentDef) ;
 *  7. les pins A(0,14)/B(84,14) restent produits par CircuitComponent/Pin ;
 *  8. aucune régression d'interaction : ni l'<img> ni les bandes ne portent
 *     de handler, les événements restent au wrapper .circuit-component ;
 *  9. la projection de bandes est dérivée de `parameters.resistance`
 *     (jamais persistée) : deux valeurs différentes produisent des codes
 *     différents, une valeur non représentable ne produit AUCUNE bande.
 *
 * Environnement jsdom (.test.jsx).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { ResistorPart } from '../ResistorPart.jsx'
import { getComponentDef } from '../../../config/componentDefinitions.js'
import { CircuitProvider } from '../../../context/CircuitContext.jsx'
import { useCircuit } from '../../../context/useCircuit.js'
import { useCircuitInteraction } from '../../../context/useCircuitInteraction.js'
import { CircuitComponent } from '../../../canvas/CircuitComponent.jsx'

const ASSET_RE = /^\/assets\/components\/resistor\/resistor\.base\.(1x|3x)\.(webp|png)( \dx)?$/

describe('001C/L1-PROP-004 — RESISTOR rend l\'asset raster neutre validé', () => {
  it('1/6 — rend un <img> aux dimensions de getComponentDef("RESISTOR") (84×28)', () => {
    const def = getComponentDef('RESISTOR')
    const { container } = render(<ResistorPart />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe(String(def.width))
    expect(img.getAttribute('height')).toBe(String(def.height))
    expect(def.width).toBe(84)
    expect(def.height).toBe(28)
  })

  it('2 — src + srcset (img et <source>) pointent vers /assets/components/resistor/resistor.base.…', () => {
    const { container } = render(<ResistorPart />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toMatch(ASSET_RE)
    for (const cand of (img.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(ASSET_RE)
    }
    const source = container.querySelector('picture > source')
    expect(source).not.toBeNull()
    expect(source.getAttribute('type')).toBe('image/webp')
    for (const cand of (source.getAttribute('srcset') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      expect(cand).toMatch(ASSET_RE)
      expect(cand).toMatch(/\.webp/)
    }
    // les 4 variantes neutres apparaissent au total
    const all = container.innerHTML
    for (const f of ['1x.webp', '3x.webp', '1x.png', '3x.png']) {
      expect(all).toContain(`/assets/components/resistor/resistor.base.${f}`)
    }
    // jamais les anciens assets `default.*` porteurs de bandes figées
    expect(all).not.toContain('resistor.default.')
  })

  it('3/4/8 — draggable=false, pointer-events:none, aucun handler d\'interaction sur l\'<img>', () => {
    const { container } = render(<ResistorPart />)
    const img = container.querySelector('img')
    expect(img.draggable).toBe(false)
    expect(img.style.pointerEvents).toBe('none')
    expect(img.onclick).toBeNull()
    expect(img.onpointerdown).toBeNull()
    expect(img.onmousedown).toBeNull()
    expect(img.onpointerup).toBeNull()
  })

  it('5 — aucun vestige de l\'ancien renderer SVG', () => {
    const { container } = render(<ResistorPart />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('line')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
    expect(container.querySelector('[aria-label="Résistance"]')).not.toBeNull()
  })

  it('déterminisme (sans paramètres) — deux rendus produisent un HTML strictement identique', () => {
    const a = render(<ResistorPart uid="r-a" />)
    const h1 = a.container.innerHTML
    a.unmount()
    const b = render(<ResistorPart uid="r-b" />)
    const h2 = b.container.innerHTML
    b.unmount()
    expect(h2).toBe(h1)
  })
})

describe('MB-L1-PROP-004 — projection dynamique du code couleur (bandes)', () => {
  function bandColors(container) {
    return [...container.querySelectorAll('.part-resistor__band')].map((el) => el.dataset.color)
  }

  it('220 Ω -> rouge / rouge / brun / or', () => {
    const { container } = render(<ResistorPart parameters={{ resistance: 220 }} />)
    expect(bandColors(container)).toEqual(['red', 'red', 'brown', 'gold'])
  })

  it('1000 Ω -> brun / noir / rouge / or (différent de 220 Ω)', () => {
    const { container } = render(<ResistorPart parameters={{ resistance: 1000 }} />)
    expect(bandColors(container)).toEqual(['brown', 'black', 'red', 'gold'])
  })

  it('deux valeurs valides différentes produisent des projections indépendantes', () => {
    const a = render(<ResistorPart parameters={{ resistance: 220 }} />)
    const b = render(<ResistorPart parameters={{ resistance: 1000 }} />)
    expect(bandColors(a.container)).not.toEqual(bandColors(b.container))
  })

  it('1234 Ω (non représentable en 4 bandes) -> AUCUNE bande, corps neutre seul', () => {
    const { container } = render(<ResistorPart parameters={{ resistance: 1234 }} />)
    expect(container.querySelector('.part-resistor__bands')).toBeNull()
    expect(bandColors(container)).toEqual([])
    // le corps raster neutre reste rendu malgré tout
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('aucune prop parameters (contrat direct) -> corps neutre, aucune bande inventée', () => {
    const { container } = render(<ResistorPart />)
    expect(container.querySelector('.part-resistor__bands')).toBeNull()
  })

  it('les bandes ne portent aucun handler et sont neutres à l\'interaction (pointer-events:none)', () => {
    const { container } = render(<ResistorPart parameters={{ resistance: 220 }} />)
    const bandsLayer = container.querySelector('.part-resistor__bands')
    expect(bandsLayer).not.toBeNull()
    expect(bandsLayer.style.pointerEvents).toBe('none')
    for (const band of container.querySelectorAll('.part-resistor__band')) {
      expect(band.onclick).toBeNull()
      expect(band.onpointerdown).toBeNull()
      expect(band.onmousedown).toBeNull()
    }
  })
})

describe('001C/L1-PROP-004 — pipeline réel : pins, paramètres et interactions inchangés', () => {
  const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
  function Harness({ onReady }) {
    const c = useCircuit()
    // MB-VIS-CANVAS-051 : `components` (componentsForRender) est désormais
    // exposé par useCircuitInteraction() (state haute fréquence) — fusionné
    // dans l'objet transmis à onReady() pour que les assertions existantes
    // (api.components...) restent inchangées.
    const { components } = useCircuitInteraction()
    onReady({ ...c, components })
    return <>{components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  it('7 — CircuitComponent produit les 2 pins RESISTOR à A(0,14) / B(84,14)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RESISTOR', 50, 60) })

    const def = getComponentDef('RESISTOR')
    const pins = container.querySelectorAll('.myblab-pin')
    expect(pins.length).toBe(def.pins.length)
    expect(def.pins.length).toBe(2)

    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[0, 14], [84, 14]]))

    // le composant rend bien l'asset raster à l'intérieur du wrapper
    expect(container.querySelector('.circuit-component img')).not.toBeNull()
    expect(container.querySelector('.circuit-component svg')).toBeNull()
  })

  it('8 — le wrapper .circuit-component reçoit toujours les événements (l\'<img> ne les capte pas)', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RESISTOR', 50, 60) })

    const wrap = container.querySelector('.circuit-component')
    expect(wrap).not.toBeNull()
    let got = 0
    wrap.addEventListener('pointerdown', () => { got += 1 })
    fireEvent.pointerDown(container.querySelector('.circuit-component img'))
    expect(got).toBe(1) // l'événement remonte au wrapper
  })

  it('9 — une nouvelle RESISTOR (défaut 220 Ω, canonicalRegistry.js) affiche rouge/rouge/brun/or via le pipeline réel', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RESISTOR', 50, 60) })

    const bandColors = [...container.querySelectorAll('.part-resistor__band')].map((el) => el.dataset.color)
    expect(bandColors).toEqual(['red', 'red', 'brown', 'gold'])
  })

  it('10 — éditer resistance via updateComponentParameters change la projection sans toucher pins/interaction', () => {
    let api
    const { container } = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
    act(() => { api.addComponent('RESISTOR', 50, 60) })
    const uid = api.components[0].uid

    act(() => { api.updateComponentParameters(uid, { resistance: 1000 }) })

    const bandColors = [...container.querySelectorAll('.part-resistor__band')].map((el) => el.dataset.color)
    expect(bandColors).toEqual(['brown', 'black', 'red', 'gold'])

    // pins toujours inchangés après édition
    const pins = container.querySelectorAll('.myblab-pin')
    const positions = [...pins].map((el) => [
      Number(el.style.left.replace('px', '')),
      Number(el.style.top.replace('px', '')),
    ])
    expect(positions).toEqual(expect.arrayContaining([[0, 14], [84, 14]]))
  })
})
