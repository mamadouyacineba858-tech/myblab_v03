// MB-VIS-CANVAS-052 (correction disclosed, même raison que CircuitComponent.jsx/
// WiresLayer.jsx/Breadboard.jsx/SimulationCanvas.jsx) : import React explicite
// requis par la config vitest secondaire pour tout fichier .jsx rendu sous
// cette config. Aucun changement de comportement.
import React from "react"
import "./GridBackground.css"

/**
 * Grille type Tinkercad sous les composants.
 */
export function GridBackground() {
  return <div className="myblab-grid" aria-hidden="true" />
}
