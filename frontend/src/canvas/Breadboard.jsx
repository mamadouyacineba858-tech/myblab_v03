// Import explicite de React, conformément à la convention déjà en usage
// dans ce dépôt pour tout fichier .jsx rendu sous la configuration de test
// jsdom secondaire (frontend/src/simulator/vitest.config.ts, sans plugin
// @vitejs/plugin-react — cf. WiresLayer.jsx, context/CircuitContext.jsx,
// components/parts/*.jsx) : Breadboard.test.jsx est le premier test à rendre
// directement un composant de frontend/src/canvas/, ce qui a révélé le
// besoin (React.createElement implicite sinon indisponible sous esbuild).
import React, { useMemo } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getPinPosition } from "../utils/geometry.js"
import {
  BREADBOARD_PITCH,
  STANDARD_V1_LAYOUT,
  STANDARD_V1_TOTAL_ROWS,
  holeAt,
} from "../utils/breadboardGeometry.js"
import "./Breadboard.css"

const HOLE_RADIUS = 1.6
// Marge visuelle autour de la grille de trous (même unité que BREADBOARD_PITCH,
// purement esthétique — ne participe à aucun calcul de connectivité).
const PADDING = BREADBOARD_PITCH

/**
 * Breadboard.jsx — MB-BREADBOARD-002 (Blueprint MB-BREADBOARD-001 §8).
 *
 * Rendu Presentation PUR de document.breadboard : aucune logique de
 * connectivité propre (LOCK-08). La grille de trous rendue est entièrement
 * dérivée de `holeAt()` (frontend/src/utils/breadboardGeometry.js) — la même
 * fonction pure que celle utilisée par breadboardConnectivity.js pour
 * dériver la connectivité réelle (AC-13/AC-14) — jamais une reconstruction
 * indépendante des bandes (rails/stripes/rainure) : ce composant ne connaît
 * aucun index de rangée, il se contente d'interroger holeAt() point par
 * point.
 *
 * Un trou "occupé" (mise en évidence visuelle optionnelle, §8) est un trou
 * qui coïncide avec la position absolue d'au moins une pin d'un composant
 * existant, via `getPinPosition()` (déjà utilisé par CircuitComponent.jsx/
 * Pin.jsx — aucune API inventée). Ceci ne calcule ni groupe électrique ni
 * union de trous entre eux (ce que fait `deriveBreadboardVirtualWires()`,
 * non appelé ici) : c'est une simple coïncidence géométrique point-à-point,
 * jamais une dérivation de connectivité.
 *
 * @param {{ breadboard: {id:string,position:{x:number,y:number},layout:string}|null, components: Array<{uid:string,type:string,x:number,y:number}> }} props
 */
export function Breadboard({ breadboard, components }) {
  const holes = useMemo(() => {
    if (!breadboard || !breadboard.position) return []
    const list = []
    for (let row = 0; row < STANDARD_V1_TOTAL_ROWS; row++) {
      for (let column = 0; column < STANDARD_V1_LAYOUT.columns; column++) {
        const x = breadboard.position.x + column * BREADBOARD_PITCH
        const y = breadboard.position.y + row * BREADBOARD_PITCH
        const hole = holeAt(breadboard, x, y)
        if (hole) list.push({ ...hole, x, y })
      }
    }
    return list
  }, [breadboard])

  const occupiedKeys = useMemo(() => {
    const set = new Set()
    if (!breadboard || !breadboard.position) return set
    for (const component of components || []) {
      const def = getComponentDef(component?.type)
      if (!def || !Array.isArray(def.pins)) continue
      for (const pin of def.pins) {
        const pos = getPinPosition(component, pin)
        if (!pos) continue
        const hole = holeAt(breadboard, pos.x, pos.y)
        if (hole) set.add(`${hole.column}:${hole.row}`)
      }
    }
    return set
  }, [breadboard, components])

  if (!breadboard || !breadboard.position) return null

  const width = (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH + PADDING * 2
  const height = (STANDARD_V1_TOTAL_ROWS - 1) * BREADBOARD_PITCH + PADDING * 2

  return (
    <svg
      className="breadboard"
      style={{ left: breadboard.position.x - PADDING, top: breadboard.position.y - PADDING }}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <rect className="breadboard__body" x={0} y={0} width={width} height={height} rx={6} />
      {holes.map((hole) => {
        const key = `${hole.column}:${hole.row}`
        const classes = [
          "breadboard__hole",
          `breadboard__hole--${hole.kind.toLowerCase()}`,
          occupiedKeys.has(key) ? "breadboard__hole--occupied" : null,
        ].filter(Boolean).join(" ")
        return (
          <circle
            key={key}
            className={classes}
            cx={hole.x - breadboard.position.x + PADDING}
            cy={hole.y - breadboard.position.y + PADDING}
            r={HOLE_RADIUS}
          />
        )
      })}
    </svg>
  )
}
