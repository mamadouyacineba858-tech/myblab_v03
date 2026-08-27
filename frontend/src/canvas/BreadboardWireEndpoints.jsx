import React, { useMemo } from "react"
import { useCircuit } from "../context/useCircuit.js"
import {
  BREADBOARD_PITCH,
  STANDARD_V1_LAYOUT,
  STANDARD_V1_TOTAL_ROWS,
  holeAt,
} from "../utils/breadboardGeometry.js"
import { makeBreadboardHoleEndpoint } from "../utils/breadboardWireEndpoint.js"

const PADDING = BREADBOARD_PITCH
const HIT_RADIUS = 5

/**
 * MB-BREADBOARD-012 — interaction layer dedicated to physical breadboard holes.
 * It sits above the breadboard artwork and below CircuitComponent, so empty
 * holes can become wire endpoints without stealing component-pin clicks.
 */
export function BreadboardWireEndpoints({ breadboard }) {
  const { pendingPin, onPinClick } = useCircuit()

  const holes = useMemo(() => {
    if (!breadboard?.position) return []
    const result = []
    for (let row = 0; row < STANDARD_V1_TOTAL_ROWS; row += 1) {
      for (let column = 0; column < STANDARD_V1_LAYOUT.columns; column += 1) {
        const x = breadboard.position.x + column * BREADBOARD_PITCH
        const y = breadboard.position.y + row * BREADBOARD_PITCH
        const hole = holeAt(breadboard, x, y)
        if (hole) result.push({ ...hole, x, y })
      }
    }
    return result
  }, [breadboard])

  if (!breadboard?.position) return null

  const width = (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH + PADDING * 2
  const height = (STANDARD_V1_TOTAL_ROWS - 1) * BREADBOARD_PITCH + PADDING * 2

  return (
    <svg
      className="breadboard-wire-endpoints"
      style={{
        position: "absolute",
        left: breadboard.position.x - PADDING,
        top: breadboard.position.y - PADDING,
        pointerEvents: "none",
        zIndex: 4,
      }}
      width={width}
      height={height}
      aria-hidden="true"
    >
      {holes.map((hole) => {
        const endpoint = makeBreadboardHoleEndpoint(breadboard.id, hole.column, hole.row)
        if (!endpoint) return null
        const isPending =
          pendingPin?.uid === endpoint.uid && pendingPin?.pinId === endpoint.pinId
        return (
          <circle
            key={`${hole.column}:${hole.row}`}
            cx={hole.x - breadboard.position.x + PADDING}
            cy={hole.y - breadboard.position.y + PADDING}
            r={HIT_RADIUS}
            fill={isPending ? "rgba(34,197,94,0.35)" : "transparent"}
            stroke={isPending ? "#22c55e" : "transparent"}
            strokeWidth={isPending ? 2 : 0}
            style={{ pointerEvents: "all", cursor: "crosshair" }}
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onPinClick(endpoint.uid, endpoint.pinId)
            }}
          />
        )
      })}
    </svg>
  )
}
