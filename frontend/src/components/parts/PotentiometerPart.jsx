import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Potentiomètre — backend RASTER.
 *
 * FT-C-COMP-003 (Rotary Physical Reconciliation) : l'asset MB-VIS-COMP-032
 * (potentiomètre schématique 90×50) est remplacé par le potentiomètre
 * ROTATIF réaliste validé par le Product Owner — bouton noir vertical + trait
 * blanc de position, écrou / rondelle métallique, corps circulaire
 * métallique, embase bleue, 3 cosses verticales, vue de face légèrement
 * supérieure, fond transparent (probe : 4 fichiers, 1x 120×120 / 3x 360×360,
 * RGBA, 3x = 3×1x). Le concept « slider / linéaire » est abandonné — aucun
 * asset slider.
 *
 * Intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('POTENTIOMETER')` → wrapper `data-bare-body` +
 * pins `markerless`), sans aucun `type === "POTENTIOMETER"` ni règle CSS
 * spécifique dans le renderer central. Patron identique à
 * `ResistorPart.jsx` / `LdrPart.jsx` : `frontend/public/` servi à la racine
 * web → `/assets/components/potentiometer/…`, priorité WebP via `<picture>`,
 * fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Composant STATIQUE — comportement électrique STRICTEMENT inchangé : aucune
 * prop reçue ni consommée, état unique `default`. Le modèle électrique
 * (`canonicalRegistry` : left/passive, wiper/output, right/passive ;
 * `PotentiometerModel`, `resistance` 10000 Ω, `position` 0.5) n'est pas
 * touché. La synchronisation visuelle du bouton avec `position` (asset
 * multi-états / rotation) est hors périmètre FT-C-COMP-003.
 *
 * Contrat :
 *  - dimensions dérivées de `getComponentDef("POTENTIOMETER")` (120×120,
 *    FT-C-COMP-003) — aucune valeur recopiée, aucune géométrie recalculée
 *    selon le zoom ;
 *  - PhysicalContacts left(36,108) / wiper(60,108) / right(84,108) :
 *    déclarés dans `PIN_PRESENTATION_BY_TYPE` (entraxe 24 = 2 × pitch),
 *    produits par CircuitComponent/Pin, jamais dessinés ici ; les cosses
 *    cuites dans le raster sont masquées par `bodyClip`
 *    (`assemblyProfiles.js`), les cosses fonctionnelles sont rendues par
 *    AssemblyLeadsLayer ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - rendu déterministe, aucun id DOM → aucune collision entre deux
 *    potentiomètres simultanés.
 */
const ASSET_DIR = '/assets/components/potentiometer'
const WEBP_SRCSET = `${ASSET_DIR}/potentiometer.default.1x.webp 1x, ${ASSET_DIR}/potentiometer.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/potentiometer.default.1x.png 1x, ${ASSET_DIR}/potentiometer.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/potentiometer.default.3x.png`

export function PotentiometerPart() {
  const def = getComponentDef("POTENTIOMETER")
  const width = def?.width ?? 120
  const height = def?.height ?? 120

  return (
    <div className="part-potentiometer" aria-label="Potentiomètre">
      <picture className="part-potentiometer__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-potentiometer__img"
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
