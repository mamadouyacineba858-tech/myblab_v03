// Import explicite de React, conformément à la convention déjà en usage
// dans ce dépôt pour tout fichier .jsx rendu sous la configuration de test
// jsdom secondaire (frontend/src/simulator/vitest.config.ts, sans plugin
// @vitejs/plugin-react — cf. WiresLayer.jsx, context/CircuitContext.jsx,
// components/parts/*.jsx) : Breadboard.test.jsx est le premier test à rendre
// directement un composant de frontend/src/canvas/, ce qui a révélé le
// besoin (React.createElement implicite sinon indisponible sous esbuild).
import React, { useCallback, useMemo } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getPinPosition } from "../utils/geometry.js"
import {
  BREADBOARD_PITCH,
  STANDARD_V1_LAYOUT,
  STANDARD_V1_TOTAL_ROWS,
  holeAt,
} from "../utils/breadboardGeometry.js"
// MB-BREADBOARD-006 (CSA Ruling — Option B, §5/§6) : Breadboard.jsx consulte
// désormais directement useCircuit() pour la sélection/le drag, même
// convention que CircuitComponent.jsx (qui n'est pas non plus 100%
// props-driven pour l'interaction) — aucun nouveau prop n'est requis côté
// SimulationCanvas.jsx pour ces deux fonctionnalités.
import { useCircuit } from "../context/useCircuit.js"
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
 * MB-BREADBOARD-003 (Blueprint §5) : `components` est déjà
 * `componentsForRender` côté appelant (aperçu de drag inclus,
 * SimulationCanvas.jsx) — le trou occupé par le composant en cours de
 * déplacement apparaît donc déjà à la bonne position sans plomberie
 * supplémentaire ici. Le nouveau prop `breadboardFeedback`
 * (`{draggedIds:Set<uid>, valid:boolean}|null`, exposé par
 * useCircuitState.js) sert uniquement à distinguer, PARMI les trous déjà
 * occupés, ceux qui appartiennent à un composant EN COURS de drag : verts
 * si `breadboardFeedback.valid`, rouges sinon (AC-08/AC-09). Un trou occupé
 * par un composant déjà posé (non draggé) reste visuellement neutre/occupé
 * (vert, comportement inchangé — MB-BREADBOARD-002).
 *
 * MB-BREADBOARD-003 (Ticket "Assembly & Interaction V1", AC-01/AC-03/AC-04/
 * AC-05) : trois enrichissements purement visuels ajoutés ci-dessous —
 * polarité +/- des rails, rainure centrale, séparateurs de groupes de 5 —
 * sont TOUS dérivés exclusivement de `holes` (calculé ci-dessous à partir de
 * holeAt(), inchangé) ou des constantes déjà exportées par
 * breadboardGeometry.js (BREADBOARD_PITCH, STANDARD_V1_LAYOUT). Aucune
 * nouvelle classification de trou, aucune tolérance/arrondi dupliqué :
 * holeAt() reste l'unique arbitre (LOCK-02/LOCK-03). La rainure en
 * particulier n'est jamais "sue" a priori : elle est déduite du vide entre
 * le dernier rang de la strip du haut et le premier rang de la strip du bas
 * — un rang qui, par construction, ne produit jamais de trou (holeAt()
 * retourne null dessus), donc absent de `holes`.
 *
 * MB-BREADBOARD-006 (CSA Ruling — Option B) : le breadboard devient un objet
 * Canvas de premier ordre — sélectionnable (clic, `selectOnly`) et
 * déplaçable (`startBreadboardDrag`), tous deux consultés via `useCircuit()`
 * (même convention que CircuitComponent.jsx). Le rendu géométrique
 * (`holes`/`railRows`/`stripExtents`/...) reste une Presentation PURE,
 * inchangée par ce ticket : `breadboard`/`components` sont déjà, côté
 * appelant, les vues "aperçu de drag inclus" (`breadboardForRender`/
 * `componentsForRender`, useCircuitState.js) — ce composant n'a donc besoin
 * d'aucune logique supplémentaire pour que le breadboard ET ses composants
 * solidaires suivent visuellement le pointeur pendant un drag.
 *
 * MB-BREADBOARD-007 (CSA GO — "Vérité visuelle du bus Breadboard") : un
 * trou occupé par AU MOINS DEUX pins partageant le même `groupKey` (rail
 * entier ou colonne de strip — même `groupKey` que celui produit par
 * `holeAt()` et consommé par `deriveBreadboardVirtualWires()`,
 * breadboardConnectivity.js, NON modifié, NON appelé ici) est distingué
 * visuellement d'un trou occupé mais encore isolé (`--occupied`, une seule
 * pin, aucun bus formé) — voir `activeGroupKeys` ci-dessous. Ce calcul ne
 * dérive AUCUNE arête, AUCUNE règle électrique nouvelle : c'est une simple
 * observation, à des fins de rendu uniquement, du même `groupKey` que celui
 * déjà retourné par `holeAt()` pour `occupiedBy`/`holes` — jamais une
 * topologie indépendante (Blueprint MB-BREADBOARD-007 §2/§3). Le moteur de
 * simulation (engine.js/preparation.js/resolution.js) reste totalement
 * inchangé et hors scope.
 *
 * MB-BREADBOARD-008 (CSA GO — "Native Breadboard Component Insertion", O5) :
 * nouveau prop `breadboardInsertPreview` — { holes: Array<{column,row}>,
 * valid: boolean } | null — publié par useCircuitState.js pendant un drag
 * HTML5 natif depuis la Sidebar (composant qui n'existe pas encore dans
 * `components`, donc aucun uid à faire correspondre via `occupiedBy` :
 * contrairement à `breadboardFeedback` ci-dessus, qui identifie les trous
 * concernés INDIRECTEMENT via occupiedBy+draggedIds, ce nouveau prop porte
 * la liste des trous DIRECTEMENT). Strictement additif : `breadboardFeedback`
 * et son mécanisme (occupiedBy/draggedIds) restent inchangés pour le
 * déplacement d'un composant déjà posé (MB-BREADBOARD-003).
 *
 * @param {{
 *   breadboard: {id:string,position:{x:number,y:number},layout:string}|null,
 *   components: Array<{uid:string,type:string,x:number,y:number}>,
 *   breadboardFeedback: {draggedIds:Set<string>, valid:boolean}|null|undefined,
 *   breadboardInsertPreview: {holes:Array<{column:number,row:number}>, valid:boolean}|null|undefined,
 * }} props
 */
export function Breadboard({ breadboard, components, breadboardFeedback, breadboardInsertPreview }) {
  // MB-BREADBOARD-006 (CSA Ruling — Option B, §5/§6) : sélection + drag du
  // breadboard lui-même, réutilisant strictement le mécanisme existant
  // (selectOnly/isSelected : selection.js générique, inchangé ; startBreadboardDrag :
  // useCircuitState.js, même session pointer que le drag de composant).
  const { selectOnly, isSelected, startBreadboardDrag } = useCircuit()
  const selected = isSelected({ type: "breadboard", id: breadboard?.id })

  const handleMouseDown = useCallback(
    (e) => {
      if (e.button !== 0 || !breadboard?.id) return
      // Même prise de contrôle totale de l'interaction souris que
      // CircuitComponent.jsx (handleBodyMouseDown) : évite tout conflit avec
      // le marquee/la sélection de canevas (SimulationCanvas.jsx).
      e.preventDefault()
      e.stopPropagation()
      // §5 du Ruling : sélection exclusive — toujours selectOnly(), jamais de
      // gestion Ctrl+clic ici (mélange breadboard+composants hors scope de
      // ce ticket).
      selectOnly({ type: "breadboard", id: breadboard.id })
      startBreadboardDrag(e)
    },
    [breadboard?.id, selectOnly, startBreadboardDrag]
  )

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

  // AC-05 : une rangée RAIL entière partage une seule polarité (son
  // groupKey se termine par ":+" ou ":-" — cf. breadboardGeometry.js
  // holeAt()) — dérivée ici uniquement pour la présentation (couleur), non
  // pour une quelconque décision de connectivité/placement.
  const railRows = useMemo(() => {
    const byRow = new Map()
    for (const hole of holes) {
      if (hole.kind !== "RAIL" || byRow.has(hole.row)) continue
      const polarity = hole.groupKey.endsWith(":+") ? "plus" : hole.groupKey.endsWith(":-") ? "minus" : null
      if (polarity) byRow.set(hole.row, polarity)
    }
    return [...byRow.entries()].map(([row, polarity]) => ({ row, polarity }))
  }, [holes])

  // AC-03/AC-04 : étendue verticale (en rangées) de chaque bloc de strip,
  // dérivée du contenu réel de `holes` — jamais d'une constante interne de
  // breadboardGeometry.js (non exportée, volontairement non dupliquée ici).
  const stripExtents = useMemo(() => {
    let topMin = null, topMax = null, bottomMin = null, bottomMax = null
    for (const hole of holes) {
      if (hole.kind !== "STRIP") continue
      if (hole.groupKey.includes(":top")) {
        topMin = topMin === null ? hole.row : Math.min(topMin, hole.row)
        topMax = topMax === null ? hole.row : Math.max(topMax, hole.row)
      } else if (hole.groupKey.includes(":bottom")) {
        bottomMin = bottomMin === null ? hole.row : Math.min(bottomMin, hole.row)
        bottomMax = bottomMax === null ? hole.row : Math.max(bottomMax, hole.row)
      }
    }
    return { topMin, topMax, bottomMin, bottomMax }
  }, [holes])

  // AC-04 : la rainure occupe le rang unique entre les deux blocs de strip —
  // absent de `holes` par construction (holeAt() y retourne null).
  const grooveRow =
    stripExtents.topMax !== null && stripExtents.bottomMin !== null
      ? (stripExtents.topMax + stripExtents.bottomMin) / 2
      : null

  // AC-03 : un séparateur discret après chaque groupe de 5 colonnes
  // (4|5, 9|10, 14|15, …) — purement décoratif (opacité faible), ne modifie
  // aucune coordonnée de trou (cx/cy des <circle> ci-dessous restent
  // exactement column*BREADBOARD_PITCH, non affectées par ce tracé).
  const groupDividerColumns = useMemo(() => {
    const columns = []
    for (let c = 4; c < STANDARD_V1_LAYOUT.columns - 1; c += 5) columns.push(c + 0.5)
    return columns
  }, [])

  // MB-BREADBOARD-003 (Blueprint §5) : Map<"col:row", Set<uid>> plutôt qu'un
  // simple Set<"col:row"> (MB-BREADBOARD-002) — nécessaire pour savoir QUELS
  // composants occupent un trou donné, afin de distinguer un trou occupé par
  // le composant en cours de drag (feedback vert/rouge) d'un trou occupé par
  // un composant déjà posé (neutre, inchangé).
  const occupiedBy = useMemo(() => {
    const map = new Map()
    if (!breadboard || !breadboard.position) return map
    for (const component of components || []) {
      const def = getComponentDef(component?.type)
      if (!def || !Array.isArray(def.pins)) continue
      for (const pin of def.pins) {
        const pos = getPinPosition(component, pin)
        if (!pos) continue
        const hole = holeAt(breadboard, pos.x, pos.y)
        if (!hole) continue
        const key = `${hole.column}:${hole.row}`
        if (!map.has(key)) map.set(key, new Set())
        map.get(key).add(component?.uid)
      }
    }
    return map
  }, [breadboard, components])

  // MB-BREADBOARD-007 (Blueprint §4/§8) : ensemble des `groupKey` occupés
  // par AU MOINS DEUX pins — dérivé exclusivement de `holes` (groupKey déjà
  // calculé par holeAt(), inchangé) et `occupiedBy` (occupation physique
  // déjà calculée ci-dessus, inchangée) : aucun nouvel appel à holeAt(),
  // aucune re-résolution de pin, aucune structure de données indépendante.
  // Un `groupKey` de rail peut compter des trous occupés à des colonnes
  // différentes (holeAt() n'indexe pas les rails par colonne) — c'est
  // exactement le cas "rail multi-colonnes" du Ticket (§6, TEST A1).
  const activeGroupKeys = useMemo(() => {
    const counts = new Map()
    for (const hole of holes) {
      const key = `${hole.column}:${hole.row}`
      if (!occupiedBy.has(key)) continue
      counts.set(hole.groupKey, (counts.get(hole.groupKey) || 0) + 1)
    }
    const active = new Set()
    for (const [groupKey, count] of counts.entries()) {
      if (count >= 2) active.add(groupKey)
    }
    return active
  }, [holes, occupiedBy])

  // MB-BREADBOARD-008 (O5) : Set<"col:row"> des trous concernés par un
  // aperçu de drop Sidebar en cours — `null` (pas juste vide) quand aucun
  // aperçu n'est actif, pour distinguer "aucun aperçu" de "aperçu avec zéro
  // trou concerné" (ce dernier cas ne devrait jamais survenir en pratique,
  // computeBreadboardPlacement() ne publiant un aperçu breadboardActive que
  // si au moins une pin a été examinée, mais la distinction reste correcte
  // par construction).
  const insertPreviewHoleKeys = useMemo(() => {
    if (!breadboardInsertPreview || !Array.isArray(breadboardInsertPreview.holes)) return null
    return new Set(breadboardInsertPreview.holes.map((h) => `${h.column}:${h.row}`))
  }, [breadboardInsertPreview])

  if (!breadboard || !breadboard.position) return null

  const width = (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH + PADDING * 2
  const height = (STANDARD_V1_TOTAL_ROWS - 1) * BREADBOARD_PITCH + PADDING * 2

  return (
    <svg
      className={`breadboard${selected ? " breadboard--selected" : ""}`}
      style={{ left: breadboard.position.x - PADDING, top: breadboard.position.y - PADDING }}
      width={width}
      height={height}
      aria-hidden="true"
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      <rect className="breadboard__body" x={0} y={0} width={width} height={height} rx={6} />

      {/* AC-04 : rainure centrale — bande visuelle, purement décorative,
          ne participe à aucun calcul de placement (LOCK-09 reste porté par
          holeAt() seul, qui ne rend aucun trou sur ce rang). */}
      {grooveRow !== null && (
        <rect
          className="breadboard__groove"
          x={0}
          y={grooveRow * BREADBOARD_PITCH + PADDING - BREADBOARD_PITCH / 2}
          width={width}
          height={BREADBOARD_PITCH}
        />
      )}

      {/* AC-05 : ligne de bus colorée par rail (rouge = +, bleu = -),
          rendue AVANT les trous pour rester visuellement "sous" eux. */}
      {railRows.map(({ row, polarity }) => (
        <line
          key={`rail-line-${row}`}
          className={`breadboard__rail-line breadboard__rail-line--${polarity}`}
          x1={0}
          x2={width}
          y1={row * BREADBOARD_PITCH + PADDING}
          y2={row * BREADBOARD_PITCH + PADDING}
        />
      ))}

      {/* AC-03 : séparateurs de groupes de 5, uniquement sur l'étendue
          verticale des deux blocs de strip (jamais à travers les rails ou
          la rainure). */}
      {stripExtents.topMin !== null &&
        groupDividerColumns.map((col) => (
          <line
            key={`group-divider-top-${col}`}
            className="breadboard__group-divider"
            x1={col * BREADBOARD_PITCH + PADDING}
            x2={col * BREADBOARD_PITCH + PADDING}
            y1={stripExtents.topMin * BREADBOARD_PITCH + PADDING}
            y2={stripExtents.topMax * BREADBOARD_PITCH + PADDING}
          />
        ))}
      {stripExtents.bottomMin !== null &&
        groupDividerColumns.map((col) => (
          <line
            key={`group-divider-bottom-${col}`}
            className="breadboard__group-divider"
            x1={col * BREADBOARD_PITCH + PADDING}
            x2={col * BREADBOARD_PITCH + PADDING}
            y1={stripExtents.bottomMin * BREADBOARD_PITCH + PADDING}
            y2={stripExtents.bottomMax * BREADBOARD_PITCH + PADDING}
          />
        ))}

      {holes.map((hole) => {
        const key = `${hole.column}:${hole.row}`
        const occupants = occupiedBy.get(key)
        // MB-BREADBOARD-003 (Blueprint §5) : parmi les occupants de ce trou,
        // au moins un appartient-il au composant en cours de drag
        // (breadboardFeedback.draggedIds) ? Si oui, le feedback vert/rouge
        // remplace la mise en évidence "occupé" neutre pour CE trou.
        const isDraggedHere =
          !!occupants &&
          !!breadboardFeedback &&
          breadboardFeedback.draggedIds instanceof Set &&
          [...occupants].some((uid) => breadboardFeedback.draggedIds.has(uid))
        const feedbackClass = isDraggedHere
          ? breadboardFeedback.valid
            ? "breadboard__hole--feedback-valid"
            : "breadboard__hole--feedback-invalid"
          : null
        // AC-05 : polarité du rail (présentation uniquement — dérivée du
        // même groupKey que railRows ci-dessus, jamais recalculée
        // différemment).
        const polarityClass =
          hole.kind === "RAIL"
            ? hole.groupKey.endsWith(":+")
              ? "breadboard__hole--rail-plus"
              : hole.groupKey.endsWith(":-")
                ? "breadboard__hole--rail-minus"
                : null
            : null
        // MB-BREADBOARD-007 : trois états mutuellement exclusifs — libre
        // (aucune classe d'occupation), occupé mais isolé (--occupied,
        // comportement MB-BREADBOARD-002 inchangé), occupé ET membre d'un
        // groupe électrique actif (--bus-active, nouveau). Un trou dont le
        // groupKey est actif mais qui n'est PAS lui-même occupé (ex. un
        // autre trou libre du même rail) reste "libre" — `isOccupied` garde
        // cette distinction (§4 du Ticket : "trou libre" reste un état
        // possible même sur un rail partiellement actif ailleurs).
        const isOccupied = !!occupants && occupants.size > 0
        const isActiveGroup = isOccupied && activeGroupKeys.has(hole.groupKey)
        // MB-BREADBOARD-008 (O5) : aperçu de drop Sidebar — même vocabulaire
        // vert/rouge que feedbackClass ci-dessus (--feedback-valid/invalid,
        // règles CSS MB-BREADBOARD-003, non dupliquées), mais indépendant de
        // `isOccupied` : le trou visé par un composant PAS ENCORE posé n'est
        // par définition pas dans `occupiedBy` (aucun uid). Priorité : un
        // drag de composant EXISTANT (feedbackClass) prime s'il devait
        // coexister (ne survient jamais en pratique : les deux systèmes de
        // drag — pointer vs HTML5 natif — sont mutuellement exclusifs), puis
        // l'aperçu Sidebar, puis les états d'occupation "au repos".
        const isInsertPreviewHere = !!insertPreviewHoleKeys && insertPreviewHoleKeys.has(key)
        const insertPreviewClass = isInsertPreviewHere
          ? breadboardInsertPreview.valid
            ? "breadboard__hole--feedback-valid"
            : "breadboard__hole--feedback-invalid"
          : null
        const occupancyClass = feedbackClass
          ? feedbackClass
          : insertPreviewClass
            ? insertPreviewClass
            : isActiveGroup
              ? "breadboard__hole--bus-active"
              : isOccupied
                ? "breadboard__hole--occupied"
                : null
        const classes = [
          "breadboard__hole",
          `breadboard__hole--${hole.kind.toLowerCase()}`,
          polarityClass,
          occupancyClass,
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
