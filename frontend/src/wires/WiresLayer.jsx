import "./WiresLayer.css"
import { useCircuit } from "../context/CircuitContext.jsx"

export function WiresLayer({ wirePaths = [] }) {
  const paths = Array.isArray(wirePaths) ? wirePaths : []
  
  // Ajout de toggleSelection pour gérer la multi-sélection
  const { isSelected, selectOnly, toggleSelection } = useCircuit()

  return (
    <svg className="wires-layer" aria-hidden="true">
      {paths.map((p) =>
        p?.id && p?.d ? (
          <g key={p.id}>
            {/* Hitzone invisible pour faciliter le clic */}
            <path
              d={p.d}
              fill="none"
              stroke="transparent"
              strokeWidth={32}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="wires-layer__hitzone"
              style={{ pointerEvents: 'stroke' }}
              onClick={(e) => {
                e.stopPropagation()
                
                // LOGIQUE ARCHITECTURE VALIDÉE : Gestion du modificateur Ctrl/Cmd
                const isMultiSelect = e.ctrlKey || e.metaKey
                
                if (isMultiSelect) {
                  toggleSelection({ type: 'wire', id: p.id })
                } else {
                  selectOnly({ type: 'wire', id: p.id })
                }
              }}
            />
            
            {/* Rendu visuel du fil */}
            <path
              d={p.d}
              fill="none"
              stroke={isSelected({ type: 'wire', id: p.id }) ? "#22c55e" : (p.color ?? "#f97316")}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        ) : null
      )}
    </svg>
  )
}