import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Buzzer — backend RASTER (MB-VIS-COMP-031).
 *
 * Remplace l'ancien rendu SVG schématique (MB-COMPONENT-LIBRARY-002 :
 * `<line>`×2 pattes + `<circle>`×3 boîtier/membrane/trou + `<text>` « + »)
 * par l'asset raster réaliste produit et vérifié pour MB-VIS-COMP-031
 * (probe pixel PASS : 8 fichiers, 1x 60×60 / 3x 180×180, RGBA, fond
 * transparent, coins transparents, sujet unique, 3x = 3×1x), intégré via le
 * mécanisme déclaratif de MB-VIS-INDUSTRIAL-001 (`defaultRegistrations` →
 * `visual: { backend: 'raster' }` → `getComponentPresentation('BUZZER')` →
 * wrapper `data-bare-body` + pins `markerless`, sans aucun
 * `type === "BUZZER"` ni règle CSS spécifique dans le renderer central).
 *
 * Patron identique à `ResistorPart.jsx` / `DiodePart.jsx` / `CapacitorPart.jsx`
 * / `DcMotorPart.jsx` : `frontend/public/` est servi à la racine web →
 * `/assets/components/buzzer/…`, priorité WebP via `<picture>`, fallback PNG,
 * aucune logique JS de sélection d'asset.
 *
 * Composant STATIQUE — comportement inchangé (MB-VIS-COMP-031 §11) : le
 * pipeline actuel n'expose AUCUN état électrique/interactif exploitable pour
 * le BUZZER (`canonicalRegistry` : 2 pins `plus`/`minus` role `input`,
 * aucun modèle d'état ; aucun resolver de Visual State Registry ; aucune
 * prop `state` posée). Le renderer se limite donc à l'état `default`. Les
 * assets `buzzer.on.*` sont livrés dans le paquet mais NON câblés ici — les
 * brancher exigerait une modification du Core/Simulation, hors périmètre.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("BUZZER")` (70×50) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins plus(10,50) / minus(60,50) : produits par CircuitComponent/Pin,
 *    jamais dessinés dans l'asset ni ici (les deux pattes visibles dans
 *    l'asset ne sont PAS des pins logiques) ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - le composant ne reçoit ni ne consomme aucune prop → rendu déterministe,
 *    aucune collision d'id entre deux buzzers simultanés (plus aucun id SVG).
 */
const ASSET_DIR = '/assets/components/buzzer'
const WEBP_SRCSET = `${ASSET_DIR}/buzzer.default.1x.webp 1x, ${ASSET_DIR}/buzzer.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/buzzer.default.1x.png 1x, ${ASSET_DIR}/buzzer.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/buzzer.default.3x.png`

export function BuzzerPart() {
  const def = getComponentDef("BUZZER")
  const width = def?.width ?? 70
  const height = def?.height ?? 50

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
