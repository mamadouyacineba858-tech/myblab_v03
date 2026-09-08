// Import React explicite : la config vitest secondaire
// (src/simulator/vitest.config.ts, sans @vitejs/plugin-react) exige React en
// portée pour tout .jsx rendu — même convention que les autres renderers du
// dépôt. Ici React est aussi réellement consommé (React.memo ci-dessous).
import React from "react"
import "./AssemblyLeadsLayer.css"

/**
 * AssemblyLeadsLayer — FT-C-001-A.
 *
 * Renderer GÉNÉRIQUE des pattes / cosses d'assemblage d'un composant
 * traversant. Ne contient AUCUNE branche `type === …` : il consomme la
 * géométrie déjà dérivée par `utils/assemblyGeometry.js` et dessine, pour
 * chaque contact, le segment `root → target`.
 *
 *   root   = naissance mécanique sous le corps (profil de présentation)
 *   target = PhysicalContact naturel = hit target du <Pin> = endpoint de fil
 *            (coïncidence garantie par construction — cf. assemblyGeometry.js)
 *
 * Rendu dans le repère LOCAL de `.circuit-component` (mêmes coordonnées que les
 * <Pin>, `left/top` relatifs à `component.x/y`) : hérite donc du
 * `transform: scale()` de focus/localScale exactement comme le corps et les
 * pins, sans correction screen-space parallèle. `overflow: visible` laisse la
 * patte dépasser la boîte du composant jusqu'au trou.
 *
 * Placé AVANT le corps dans le DOM : la racine est peinte SOUS l'asset (cachée
 * naturellement sous le corps, §13), l'extension métallique ressort en dessous.
 * `pointer-events: none` : drag / sélection / câblage / hit-test restent la
 * responsabilité du wrapper et des <Pin>.
 *
 * @param {{
 *   geometry: import('../../utils/assemblyGeometry.js').AssemblyGeometry,
 *   originX: number,
 *   originY: number,
 * }} props
 */
function AssemblyLeadsLayerImpl({ geometry, originX = 0, originY = 0 }) {
  const contacts = geometry && Array.isArray(geometry.contacts) ? geometry.contacts : []
  if (contacts.length === 0) return null

  return (
    <svg
      className="assembly-leads"
      data-inserted={geometry.inserted ? "" : undefined}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
    >
      {contacts.map((c) => {
        const x1 = c.root.x - originX
        const y1 = c.root.y - originY
        const x2 = c.target.x - originX
        const y2 = c.target.y - originY
        if (![x1, y1, x2, y2].every(Number.isFinite)) return null
        return (
          <line
            key={`${c.pinId}:${c.contactId}`}
            className={`assembly-leads__lead assembly-leads__lead--${c.style}`}
            data-pin={c.pinId}
            data-contact={c.contactId}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
          />
        )
      })}
    </svg>
  )
}

// React.memo : ne re-rend que si `geometry` (mémoïsée dans CircuitComponent,
// deps [component, breadboard]) ou les origins changent — même discipline
// d'isolation que CircuitComponent (MB-VIS-CANVAS-051).
export const AssemblyLeadsLayer = React.memo(AssemblyLeadsLayerImpl)
