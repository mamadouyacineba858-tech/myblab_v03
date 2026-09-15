import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * A3-SW2-R1 — DIP Switch 4 positions, renderer raster réaliste (paquet
 * d'assets validé fourni par le Founder, `manifest.json` /
 * `ASSET-INTEGRITY.json`) — remplace le renderer CSS/DOM schématique initial
 * de A3-SW2 (housing `#1e293b` + curseurs orange plats).
 *
 * Patron identique à SlideSwitchPart.jsx : `frontend/public/` est servi à la
 * racine web -> `/assets/components/dip-switch/…`, priorité WebP via
 * `<picture>`, fallback PNG, un seul état d'asset `reference` (photo housing
 * statique, cf. manifest.json).
 *
 * DIP_SWITCH reste un composant INTERACTIF à 4 canaux INDÉPENDANTS. Contrat
 * de props STRICTEMENT CONSERVÉ (A3-SW2, capacité déclarative
 * interaction.type === "multi-state-toggle", componentDefinitions.js) :
 *  - `channelStates`, `onPointerDown`/`onPointerMove`/`onClick` — fournis par
 *    CircuitComponent.jsx (mécanisme SetComponentChannelStateCommand /
 *    undo-redo non touché par cette correction visuelle) ;
 *  - chaque actuateur porte `data-channel-id` (convention de présentation
 *    générique lue par CircuitComponent.jsx pour router le clic vers le bon
 *    canal, jamais un branchement sur un nom de type) et les classes
 *    `is-on`/`is-off` (contrat DOM inchangé, cf. DipSwitchInteraction.test.jsx) ;
 *  - `aria-label` dynamique sur la racine `.part-dip-switch` (format inchangé).
 *
 * Stratégie des 16 combinaisons (ticket A3-SW2-R1 §7) : l'asset référence ne
 * fige qu'UNE seule photo réaliste (housing + broches + "ON" + 1..4), dans
 * l'état channelStates 1=on/2=off/3=on/4=off (manifest.json#visualContract.
 * referenceChannelStates). Cette photo N'EST PAS la vérité métier : le
 * boîtier/le texte qu'elle montre reste un DÉCOR statique, mais l'emplacement
 * de chaque curseur y est intégralement recouvert par un
 * `.part-dip-switch__track`/`__thumb` dessiné dynamiquement (géométrie
 * mesurée sur cette même photo par analyse pixel, couleurs échantillonnées
 * sur cette même photo pour rester visuellement cohérentes) qui, lui, reflète
 * `channelStates` en temps réel — un seul modèle métier, un seul <img> pour
 * les 16 combinaisons, aucun overlay ne devient une deuxième source de
 * vérité.
 *
 * Le `<picture>`/`<img>` est purement visuel et non interactif :
 * `pointer-events: none`, `draggable={false}` — le hit-test et le câblage
 * restent entièrement gérés par le wrapper `.circuit-component` / cet
 * élément racine, jamais par l'image.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("DIP_SWITCH")` (112×56) —
 *    aucune valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins 1A..4B : produits par CircuitComponent/Pin, jamais dessinés dans
 *    l'asset ni ici ;
 *  - `breadboardInsertable` reste `false` (componentDefinitions.js, non
 *    touché par ce fichier) — DIP_SWITCH n'est PAS qualifié pour l'insertion
 *    breadboard dans ce ticket (FOLLOW-UP FOUNDER OBSERVATION SLIDE_SWITCH
 *    hors scope de R1, cf. rapport final).
 */
const ASSET_DIR = '/assets/components/dip-switch'

const HOUSING_SOURCE = {
  webp: `${ASSET_DIR}/dip-switch.reference.1x.webp 1x, ${ASSET_DIR}/dip-switch.reference.3x.webp 3x`,
  png: `${ASSET_DIR}/dip-switch.reference.1x.png 1x, ${ASSET_DIR}/dip-switch.reference.3x.png 3x`,
  fallback: `${ASSET_DIR}/dip-switch.reference.3x.png`,
}

// Géométrie des 4 curseurs (unités canvas @1×, boîte canonique 112×56 —
// componentDefinitions.js NON modifié). Mesurée par analyse pixel de
// dip-switch.reference.1x.png (détection des bandes lumineuses des
// actuateurs réels, mise à l'échelle 112/160 = 0.7) : PAS une simple
// progression arithmétique, la photo est une prise de vue en perspective et
// l'espacement réel entre curseurs n'est pas parfaitement régulier.
const TRACK_TOP = 10
const TRACK_HEIGHT = 18
const THUMB_HEIGHT = 9
const CHANNEL_GEOMETRY = {
  '1': { x: 25, width: 11 },
  '2': { x: 44, width: 8 },
  '3': { x: 58, width: 10 },
  '4': { x: 75, width: 8 },
}

export function DipSwitchPart({
  channelStates,
  onPointerDown,
  onPointerMove,
  onClick,
}) {
  const def = getComponentDef('DIP_SWITCH')
  const width = def?.width ?? 112
  const height = def?.height ?? 56
  const channels = def?.interaction?.channels ?? []
  const states = channelStates && typeof channelStates === 'object' ? channelStates : {}

  return (
    <div
      className="part-dip-switch"
      aria-label={`Interrupteur DIP 4 positions : ${channels.map((ch) => `${ch}=${states[ch] === 'on' ? 'ON' : 'OFF'}`).join(', ')}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onClick={onClick}
      style={{
        position: 'relative',
        width,
        height,
        boxSizing: 'border-box',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <picture className="part-dip-switch__picture">
        <source type="image/webp" srcSet={HOUSING_SOURCE.webp} />
        <img
          className="part-dip-switch__img"
          src={HOUSING_SOURCE.fallback}
          srcSet={HOUSING_SOURCE.png}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      </picture>

      {channels.map((channelId) => {
        const isOn = states[channelId] === 'on'
        const geo = CHANNEL_GEOMETRY[channelId]
        if (!geo) return null
        return (
          <div
            key={channelId}
            className={`part-dip-switch__channel${isOn ? ' is-on' : ' is-off'}`}
            data-channel-id={channelId}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: geo.x,
              top: TRACK_TOP,
              width: geo.width,
              height: TRACK_HEIGHT,
              borderRadius: 2,
              background: 'linear-gradient(#050506, #1c1c1e)',
              border: '1px solid rgba(0,0,0,0.6)',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="part-dip-switch__thumb"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 1,
                top: isOn ? 1 : TRACK_HEIGHT - THUMB_HEIGHT - 1,
                width: Math.max(geo.width - 4, 2),
                height: THUMB_HEIGHT,
                borderRadius: 1.5,
                background: 'linear-gradient(#f2ede4, #d8d2c6)',
                border: '1px solid rgba(0,0,0,0.35)',
                transition: 'top 0.1s ease-out',
                pointerEvents: 'none',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
