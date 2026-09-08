/**
 * BreadboardWiresLayerContact.test.jsx — FT-B-001-S3 (§10, TEST S3-H / S3-L).
 *
 * BreadboardWiresLayer reconstruit l'extrémité "composant" d'un fil dont
 * l'autre extrémité est un trou de breadboard. S3 : cette reconstruction
 * honore l'ancre de contact physique persistée S2 (`fromContact` /
 * `toContact`). Repli DÉTERMINISTE (INV-S3-15) : contactId absent, inconnu ou
 * périmé ⇒ contact PAR DÉFAUT de la MÊME pin canonique — jamais une autre pin,
 * jamais d'erreur.
 *
 * Rendu isolé : contextes minimaux (fakes), comme Breadboard.test.jsx — ce
 * fichier ne teste que la géométrie d'extrémité, pas la sélection/le drag.
 *
 * BUTTON @ {x:0,y:48}. Contacts (componentDefinitions.js) :
 *   pin1 : 1a=(dx14,dy58) [DÉFAUT], 1b=(dx14,dy2)
 * ⇒ position absolue : 1a=(14,106), 1b=(14,50).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CircuitContext, CircuitInteractionContext } from '../../context/CircuitContext.js'
import { BreadboardWiresLayer } from '../BreadboardWiresLayer.jsx'
import { makeBreadboardHoleEndpoint } from '../../utils/breadboardWireEndpoint.js'
import { extractPointsFromPathData } from '../../utils/geometry.js'

const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
const button = { uid: 'btn1', type: 'BUTTON', x: 0, y: 48 }
// trou cible arbitraire mais valide (strip col10 top) — l'autre extrémité du fil
const targetHole = makeBreadboardHoleEndpoint('bb1', 10, 3)

function renderLayer(wire) {
  const circuit = {
    wires: [wire],
    isSelected: () => false,
    selectOnly: () => {},
    toggleSelection: () => {},
  }
  const interaction = { components: [button], breadboard }
  return render(
    <CircuitContext.Provider value={circuit}>
      <CircuitInteractionContext.Provider value={interaction}>
        <BreadboardWiresLayer />
      </CircuitInteractionContext.Provider>
    </CircuitContext.Provider>
  )
}

function componentEndpointOf(container) {
  const path = container.querySelector('.wires-layer--breadboard path[aria-label]')
  expect(path).not.toBeNull()
  // buildWirePath sans waypoint : "M x1 y1 L ..." — point[0] = extrémité "from"
  return extractPointsFromPathData(path.getAttribute('d'))[0]
}

describe('FT-B-001-S3 — TEST S3-H : extrémité de fil breadboard ancrée au CONTACT exact', () => {
  it('fromContact "1b" ⇒ l\'extrémité composant est en (14,50), PAS à la position du contact par défaut (14,106)', () => {
    const { container } = renderLayer({
      id: 'w1',
      fromUid: 'btn1', fromPin: 'pin1', fromContact: '1b',
      toUid: targetHole.uid, toPin: targetHole.pinId,
    })
    expect(componentEndpointOf(container)).toEqual({ x: 14, y: 50 })
  })

  it('fromContact "1a" (contact par défaut) ⇒ extrémité en (14,106)', () => {
    const { container } = renderLayer({
      id: 'w1',
      fromUid: 'btn1', fromPin: 'pin1', fromContact: '1a',
      toUid: targetHole.uid, toPin: targetHole.pinId,
    })
    expect(componentEndpointOf(container)).toEqual({ x: 14, y: 106 })
  })

  it('contactId ABSENT ⇒ repli déterministe sur le contact par défaut de pin1 (14,106), aucun crash', () => {
    const { container } = renderLayer({
      id: 'w1',
      fromUid: 'btn1', fromPin: 'pin1',
      toUid: targetHole.uid, toPin: targetHole.pinId,
    })
    expect(componentEndpointOf(container)).toEqual({ x: 14, y: 106 })
  })

  it('contactId PÉRIMÉ / inconnu ("zzz") ⇒ repli sur le contact par défaut de LA MÊME pin (14,106), jamais une autre pin, aucun crash', () => {
    const { container } = renderLayer({
      id: 'w1',
      fromUid: 'btn1', fromPin: 'pin1', fromContact: 'zzz',
      toUid: targetHole.uid, toPin: targetHole.pinId,
    })
    expect(componentEndpointOf(container)).toEqual({ x: 14, y: 106 })
  })

  it('l\'ancre suit le composant : BUTTON déplacé de (0,48) à (24,60) ⇒ contact "1b" en (38,62)', () => {
    const moved = { uid: 'btn1', type: 'BUTTON', x: 24, y: 60 }
    const circuit = { wires: [{ id: 'w1', fromUid: 'btn1', fromPin: 'pin1', fromContact: '1b', toUid: targetHole.uid, toPin: targetHole.pinId }], isSelected: () => false, selectOnly: () => {}, toggleSelection: () => {} }
    const interaction = { components: [moved], breadboard }
    const { container } = render(
      <CircuitContext.Provider value={circuit}>
        <CircuitInteractionContext.Provider value={interaction}>
          <BreadboardWiresLayer />
        </CircuitInteractionContext.Provider>
      </CircuitContext.Provider>
    )
    expect(componentEndpointOf(container)).toEqual({ x: 24 + 14, y: 60 + 2 })
  })
})

describe('FT-B-001-S3 — TEST S3-L : document/fil legacy sans champ de contact', () => {
  it('un fil mono-contact (RESISTOR) sans fromContact/toContact rend et fonctionne comme avant S3', () => {
    const resistor = { uid: 'r1', type: 'RESISTOR', x: 0, y: 22 }
    const circuit = {
      wires: [{ id: 'w1', fromUid: 'r1', fromPin: 'A', toUid: targetHole.uid, toPin: targetHole.pinId }],
      isSelected: () => false, selectOnly: () => {}, toggleSelection: () => {},
    }
    const interaction = { components: [resistor], breadboard }
    const { container } = render(
      <CircuitContext.Provider value={circuit}>
        <CircuitInteractionContext.Provider value={interaction}>
          <BreadboardWiresLayer />
        </CircuitInteractionContext.Provider>
      </CircuitContext.Provider>
    )
    // RESISTOR pin A = (x+dx, y+dy) = (0+0, 22+14) = (0,36) — géométrie
    // canonique inchangée (contact implicite en pin.dx/dy).
    expect(componentEndpointOf(container)).toEqual({ x: 0, y: 36 })
  })
})
