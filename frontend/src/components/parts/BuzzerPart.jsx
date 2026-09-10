import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Buzzer — backend RASTER.
 *
 * FT-C-COMP-004 (Buzzer Realistic Physical Reconciliation) : l'ancien asset
 * schématique (boîte 70×50, raster 60×60) est remplacé par le buzzer piézo
 * TRAVERSANT réaliste validé par le Product Owner — corps cylindrique noir,
 * vue légèrement supérieure, trou acoustique central, symbole « + » discret,
 * deux pattes métalliques verticales, fond transparent (probe : 4 fichiers,
 * 1x 120×120 / 3x 360×360, RGBA, 3x = 3×1x). Le paquet ne contient plus que
 * l'état `default` — les anciens assets `buzzer.on.*` sont retirés, aucun
 * état visuel « on » n'est réintroduit (hors périmètre FT-C-COMP-004).
 *
 * Intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('BUZZER')` → wrapper `data-bare-body` + pins
 * `markerless`), sans aucun `type === "BUZZER"` ni règle CSS spécifique dans
 * le renderer central. Patron identique à `ResistorPart.jsx` /
 * `PolarizedCapacitorPart.jsx` : `frontend/public/` servi à la racine web →
 * `/assets/components/buzzer/…`, priorité WebP via `<picture>`, fallback PNG,
 * aucune logique JS de sélection d'asset.
 *
 * Composant STATIQUE — comportement électrique STRICTEMENT inchangé : aucune
 * prop reçue ni consommée, état unique `default`. Le modèle électrique
 * (`canonicalRegistry` : 2 pins `plus` / `minus` role `input`, aucun modèle
 * d'état) n'est pas touché ; aucune simulation, aucune animation, aucun glow.
 *
 * Contrat :
 *  - dimensions dérivées de `getComponentDef("BUZZER")` (120×120,
 *    FT-C-COMP-004) — aucune valeur recopiée, aucune géométrie recalculée
 *    selon le zoom ; boîte carrée = raster carré → ratio conservé ;
 *  - PhysicalContacts plus(42,108) / minus(78,108) déclarés dans
 *    `PIN_PRESENTATION_BY_TYPE` (entraxe 36 = 3 × BREADBOARD_PITCH), produits
 *    par CircuitComponent/Pin, jamais dessinés ici ; les pattes cuites dans
 *    le raster sont masquées par `bodyClip` (`assemblyProfiles.js`), les
 *    pattes fonctionnelles sont rendues par AssemblyLeadsLayer ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - le composant ne reçoit ni ne consomme aucune prop → rendu déterministe,
 *    aucune collision d'id entre deux buzzers simultanés (aucun id DOM).
 */
const ASSET_DIR = '/assets/components/buzzer'
const WEBP_SRCSET = `${ASSET_DIR}/buzzer.default.1x.webp 1x, ${ASSET_DIR}/buzzer.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/buzzer.default.1x.png 1x, ${ASSET_DIR}/buzzer.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/buzzer.default.3x.png`

export function BuzzerPart() {
  const def = getComponentDef("BUZZER")
  const width = def?.width ?? 120
  const height = def?.height ?? 120

  return (
    <div className="part-buzzer" aria-label="Buzzer">
      <picture className="part-buzzer__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-buzzer__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
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
