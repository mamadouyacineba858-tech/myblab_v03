import React, { useCallback, useMemo, useState } from "react"
import "./WiresLayer.css"
import { useCircuit } from "../context/useCircuit.js"
import { getWireStrokeColor, getWireStateClassName } from "./wirePath.js"
import { getWireLogicalState, Signal } from "./wireState.js"

/**
 * Rendu d'un fil individuel (MB-VIS-004).
 *
 * Extrait de WiresLayer pour porter localement l'état hover, exactement
 * comme Pin.jsx (useState local + onMouseEnter/onMouseLeave) — aucun suivi
 * de position de curseur, aucune prévisualisation (arbitrage CSA Q1,
 * 2026-08-20 : option (a) exclusivement, interactions déjà supportées).
 */
function WireVisual({ id, d, fromUid, fromPin, toUid, toPin, pinSignals, selected, onSelect }) {
  const [hover, setHover] = useState(false)

  const { signal } = getWireLogicalState({ fromUid, fromPin, toUid, toPin }, pinSignals)
  const stroke = getWireStrokeColor({ selected, signal })
  const stateClassName = getWireStateClassName({ signal })
  const isFloating = signal === Signal.FLOATING

  const visibleClassName = [
    "wires-layer__wire",
    stateClassName,
    hover && "wires-layer__wire--hover",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <g>
      {/* Hitzone invisible pour faciliter le clic et détecter le survol */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="wires-layer__hitzone"
        style={{ pointerEvents: 'stroke' }}
        onClick={onSelect}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      />

      {/* Rendu visuel du fil */}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isFloating ? "6 4" : undefined}
        className={visibleClassName}
        style={{ pointerEvents: 'none' }}
        aria-label={id}
      />
    </g>
  )
}

export function WiresLayer({ wirePaths = [] }) {
  const paths = Array.isArray(wirePaths) ? wirePaths : []

  // pinSignals et wires sont déjà exposés par useCircuit() (useCircuitState.js) —
  // aucun nouveau prop threading requis depuis SimulationCanvas.jsx.
  const { isSelected, selectOnly, toggleSelection, wires, pinSignals } = useCircuit()

  // Jointure géométrie (wirePaths: {id, d}, géométrie pure — cf. circuitSelectors.js)
  // ↔ topologie (wires: {id, fromUid, fromPin, toUid, toPin}), par id.
  const wiresById = useMemo(() => {
    const map = new Map()
    if (Array.isArray(wires)) {
      for (const wire of wires) {
        if (wire?.id) map.set(wire.id, wire)
      }
    }
    return map
  }, [wires])

  const handleSelect = useCallback(
    (wireId) => (e) => {
      e.stopPropagation()
      const isMultiSelect = e.ctrlKey || e.metaKey
      if (isMultiSelect) {
        toggleSelection({ type: 'wire', id: wireId })
      } else {
        selectOnly({ type: 'wire', id: wireId })
      }
    },
    [selectOnly, toggleSelection]
  )

  return (
    <svg className="wires-layer" aria-hidden="true">
      {paths.map((p) => {
        if (!p?.id || !p?.d) return null
        const wire = wiresById.get(p.id)
        return (
          <WireVisual
            key={p.id}
            id={p.id}
            d={p.d}
            fromUid={wire?.fromUid}
            fromPin={wire?.fromPin}
            toUid={wire?.toUid}
            toPin={wire?.toPin}
            pinSignals={pinSignals}
            selected={isSelected({ type: 'wire', id: p.id })}
            onSelect={handleSelect(p.id)}
          />
        )
      })}
    </svg>
  )
}
