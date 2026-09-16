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
 *
 * A3-SW3-R1 — correctif de continuité visuelle patte/corps (Founder Canvas
 * FAIL, état RIGHT) : audit pixel des deux fichiers sources
 * (`slide-switch.left.1x.png` / `slide-switch.right.1x.png`, INCHANGÉS,
 * jamais édités) a montré que le boîtier y est photographié/exporté avec un
 * décalage horizontal d'environ 12px entre les deux états (housing gauche
 * silhouette x≈14-61 ; housing droit x≈26-70 — même objet, cadrage différent
 * entre les deux prises). `assemblyProfiles.js` (SLIDE_SWITCH) ancre les 3
 * pattes fonctionnelles verticalement à l'aplomb EXACT des PhysicalContacts
 * throwA/common/throwB (dx 12/36/60, INCHANGÉS — même convention que tout le
 * catalogue : aucun lead diagonal). Sans correction, throwA (dx=12) tombe
 * ~14px en dehors de la silhouette du boîtier RIGHT (qui démarre à x≈26) :
 * la patte dessinée par AssemblyLeadsLayer naît alors dans une zone
 * transparente, visuellement détachée du corps. RIGHT_IMAGE_CORRECTION_PX
 * recale UNIQUEMENT le RENDU de l'asset RIGHT (translation CSS, fichier
 * PNG/WebP non modifié) pour ramener sa silhouette au même repère que LEFT
 * — les 3 pattes redeviennent alors à l'aplomb du boîtier dans les DEUX
 * états (marge résiduelle ~2px, identique à celle déjà tolérée côté LEFT,
 * cf. rapport final A3-SW3-R1).
 */
const RIGHT_IMAGE_CORRECTION_PX = -12
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
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
            transform: isRight ? `translateX(${RIGHT_IMAGE_CORRECTION_PX}px)` : undefined,
          }}
        />
      </picture>
    </div>
  )
}
