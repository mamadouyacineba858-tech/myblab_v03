import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * A3-SW1-R1 — Slide Switch (SPDT), renderer raster réaliste (paquet
 * d'assets validé fourni par le Founder, `manifest.json` /
 * `ASSET-INTEGRITY.json`) — remplace le renderer CSS/DOM schématique
 * initial de A3-SW1.
 *
 * Patron identique à LatchingButtonPart.jsx : `frontend/public/` est servi
 * à la racine web -> `/assets/components/slide-switch/…`, priorité WebP via
 * `<picture>`, fallback PNG, aucune logique JS de sélection d'asset au-delà
 * du choix left/right.
 *
 * SLIDE_SWITCH reste un composant INTERACTIF. Le contrat de props de ce
 * fichier est STRICTEMENT CONSERVÉ (A3-SW1, capacité déclarative
 * interaction.type === "state-toggle", componentDefinitions.js) :
 *  - state, onPointerDown, onPointerMove, onClick — tous fournis par
 *    CircuitComponent.jsx (mécanisme SetComponentStateCommand / undo-redo
 *    non touché par cette correction visuelle) ;
 *  - classes `part-slide-switch` / `is-left` / `is-right` ;
 *  - `aria-label` dynamique.
 * Le `<picture>`/`<img>` est purement visuel et non interactif :
 * `pointer-events: none`, `draggable={false}` — le hit-test et le câblage
 * restent entièrement gérés par le wrapper `.circuit-component` / cet
 * élément racine, jamais par l'image.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("SLIDE_SWITCH")` (72×48) —
 *    aucune valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins throwA/common/throwB : produits par CircuitComponent/Pin, jamais
 *    dessinés dans l'asset ni ici ;
 *  - sélection d'asset : left -> `slide-switch.left.*`, right ->
 *    `slide-switch.right.*` — dérivée exclusivement de la prop `state`
 *    existante, aucune logique électrique déplacée ici.
 */
const ASSET_DIR = '/assets/components/slide-switch'

const ASSET_SOURCES = {
  left: {
    webp: `${ASSET_DIR}/slide-switch.left.1x.webp 1x, ${ASSET_DIR}/slide-switch.left.3x.webp 3x`,
    png: `${ASSET_DIR}/slide-switch.left.1x.png 1x, ${ASSET_DIR}/slide-switch.left.3x.png 3x`,
    fallback: `${ASSET_DIR}/slide-switch.left.3x.png`,
  },
  right: {
    webp: `${ASSET_DIR}/slide-switch.right.1x.webp 1x, ${ASSET_DIR}/slide-switch.right.3x.webp 3x`,
    png: `${ASSET_DIR}/slide-switch.right.1x.png 1x, ${ASSET_DIR}/slide-switch.right.3x.png 3x`,
    fallback: `${ASSET_DIR}/slide-switch.right.3x.png`,
  },
}

export function SlideSwitchPart({
  state,
  onPointerDown,
  onPointerMove,
  onClick,
}) {
  const def = getComponentDef('SLIDE_SWITCH')
  const width = def?.width ?? 72
  const height = def?.height ?? 48
  const isRight = state === 'right'
  const source = isRight ? ASSET_SOURCES.right : ASSET_SOURCES.left

  return (
    <div
      className={`part-slide-switch${isRight ? ' is-right' : ' is-left'}`}
      aria-label={isRight ? 'Interrupteur à glissière : position droite' : 'Interrupteur à glissière : position gauche'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <picture className="part-slide-switch__picture">
        <source type="image/webp" srcSet={source.webp} />
        <img
          className="part-slide-switch__img"
          src={source.fallback}
          srcSet={source.png}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        />
      </picture>
    </div>
  )
}
