// Import React explicite : requis par la config vitest secondaire
// (frontend/src/simulator/vitest.config.ts, sans @vitejs/plugin-react) pour
// tout .jsx rendu sous cette config — même convention que Sidebar.jsx /
// CircuitComponent.jsx / les Part renderers.
import React, { useMemo } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import { PartRenderer } from "./parts/PartRenderer.jsx"
import "./ComponentPreview.css"

const EMPTY_PIN_SIGNALS = new Map()
// Cadre de miniature borné (F10) — même emprise que l'ancienne case LED
// (Sidebar.css historique, `.myblab-palette__icon--led` 42×38) : remplacer
// l'exception LED par ce canal générique ne déplace donc aucune autre
// colonne de la palette.
const CELL_WIDTH = 42
const CELL_HEIGHT = 38
// Marge respirante à l'intérieur du cadre — jamais 1.0 (un composant
// toucherait alors exactement les bords de sa cellule).
const CELL_FILL = 0.92

/**
 * ComponentPreview.jsx — MB-VIS-LAB-046 (§9, F9/F10/F11).
 *
 * Miniature Presentation PURE de la palette Sidebar, réutilisant le MÊME
 * canal déclaratif type -> renderer que le Canvas — PartRenderer.jsx, donc
 * DEFAULT_REGISTRATIONS (visualization/defaultRegistrations.js) +
 * VisualizationManager + VisualStateRegistry — jamais un branchement
 * `type === "…"` ici ni dans Sidebar.jsx (I-046-15/16/17). Un futur type
 * enregistré dans le registre profite de ce mécanisme sans toucher ce
 * fichier ni Sidebar.jsx (I-046-18).
 *
 * N'est JAMAIS un CircuitComponent miniature (F9) : aucun <Pin>, aucun hit
 * target, aucune sélection/focus/localScale/wiring/History/Document/
 * Simulation — uniquement PartRenderer, exactement comme
 * canvas/ComponentInsertGhost.jsx (BREAD-042) le fait déjà pour l'aperçu de
 * drag Sidebar → Canvas (I-046-03/04/05/19/20/21/22/23/24/25).
 *
 * État neutre par construction (F11) : `pinSignals` est TOUJOURS la Map
 * vide (jamais de simulation) et `state` dérive uniquement de
 * `componentDefinitions.js#initialState` quand un type le déclare (BUTTON
 * -> "released", BUTTON_LATCHING -> "off") — aucune nouvelle logique
 * Simulation/état n'est introduite ici ; un type sans `initialState` reçoit
 * `undefined`, ignoré par les renderers qui n'en ont pas besoin.
 *
 * L'échelle est un problème de PRESENTATION LOCAL À LA MINIATURE
 * uniquement (F10) : dérivée de la boîte canonique déjà exposée par
 * `componentDefinitions.js#width/height` (jamais dupliquée/réinventée,
 * jamais modifiée) pour REMPLIR le cadre borné CELL_WIDTH×CELL_HEIGHT —
 * jamais un coefficient global figé comme l'ancien `scale(0.52)` propre à
 * LED (I-046-06/07).
 *
 * @param {{ type: string }} props
 */
export function ComponentPreview({ type }) {
  const def = useMemo(() => getComponentDef(type), [type])

  const scale = useMemo(() => {
    if (!def) return 1
    const boxWidth = def.width ?? 80
    const boxHeight = def.height ?? 40
    return Math.min(CELL_WIDTH / boxWidth, CELL_HEIGHT / boxHeight) * CELL_FILL
  }, [def])

  if (!def) return null

  return (
    <span className="component-preview" aria-hidden="true">
      <span
        className="component-preview__stage"
        style={{
          width: def.width ?? 80,
          height: def.height ?? 40,
          transform: `scale(${scale})`,
        }}
      >
        <PartRenderer
          type={type}
          uid={`__sidebar-preview__${type}`}
          pinSignals={EMPTY_PIN_SIGNALS}
          state={def.initialState}
        />
      </span>
    </span>
  )
}
