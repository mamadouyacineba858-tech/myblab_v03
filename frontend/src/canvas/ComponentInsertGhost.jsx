// Import React explicite : même convention que les autres fichiers .jsx du
// dossier canvas/ (CircuitComponent.jsx, Breadboard.jsx, SimulationCanvas.jsx)
// — requis par la config vitest secondaire (frontend/src/simulator/
// vitest.config.ts, sans @vitejs/plugin-react) pour tout .jsx rendu sous
// cette config, et ici réellement consommé (React.memo ci-dessous).
import React, { useMemo } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getComponentPresentation } from "../visualization/defaultRegistrations.js"
import { getAssemblyProfile } from "../visualization/assemblyProfiles.js"
import { resolveAssemblyGeometry } from "../utils/assemblyGeometry.js"
import { AssemblyLeadsLayer } from "../components/assembly/AssemblyLeadsLayer.jsx"
import { PartRenderer } from "../components/parts/PartRenderer.jsx"
import "./ComponentInsertGhost.css"

const EMPTY_PIN_SIGNALS = new Map()
// Identité de présentation stable, jamais un uid Document — ce composant ne
// désigne aucune entité réelle (INV-042-12 : le ghost n'entre jamais dans
// `components`/le Document/la simulation).
const GHOST_UID = "__mb-vis-bread-042-insert-ghost__"

/**
 * ComponentInsertGhost.jsx — MB-VIS-BREAD-042 (§4/§12).
 *
 * Preview PHYSIQUE, Presentation PURE, du composant en cours de drag HTML5
 * natif depuis la Sidebar, affichée à la position CANDIDATE déjà résolue par
 * le moteur de placement canonique (computeMultiBreadboardPlacement — voir
 * `breadboardInsertPreview.position`, useCircuitState.js). Ce fichier ne
 * calcule JAMAIS lui-même de snap/trou/collision (RULING CSA §3) : il se
 * contente d'afficher, à la position REÇUE, le MÊME rendu visuel qu'un
 * composant réellement posé.
 *
 * Réutilise strictement les briques canoniques déjà consommées par
 * CircuitComponent.jsx — PartRenderer (rendu du composant), AssemblyLeadsLayer
 * (pattes/cosses d'assemblage), et la classe CSS globale
 * `.circuit-component__body` (CircuitComponent.css, déjà chargée dès que
 * SimulationCanvas.jsx est monté) — aucune seconde bibliothèque de dessin
 * "preview", aucun style dupliqué (§4 du Blueprint : "le ghost doit utiliser
 * le renderer existant du composant").
 *
 * Différences volontaires avec CircuitComponent.jsx (§12, Phase C) :
 *   - aucun `uid` Document (GHOST_UID est une constante de présentation,
 *     jamais lue par selection.js/HistoryManager/simulation) ;
 *   - aucun <Pin> (aucun hit target de câblage, jamais sélectionnable) ;
 *   - aucun handler souris/pointeur (`pointer-events: none` sur tout l'arbre,
 *     CSS) — ne doit jamais intercepter le `dragover` natif destiné au
 *     Canvas ;
 *   - `pinSignals` toujours vide : le ghost n'a pas de signal électrique
 *     (INV-042-14, aucune topologie électrique concernée).
 *
 * @param {{
 *   type: string,
 *   position: {x:number,y:number}|null,
 *   valid: boolean,
 *   breadboard: {id:string,position:{x:number,y:number}}|null,
 * }} props
 */
function ComponentInsertGhostImpl({ type, position, valid, breadboard = null }) {
  const def = useMemo(() => getComponentDef(type), [type])
  const presentation = useMemo(() => getComponentPresentation(type), [type])

  const component = useMemo(() => {
    if (!def || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null
    return { type, x: position.x, y: position.y }
  }, [def, type, position])

  // Même primitive que CircuitComponent.jsx (FT-C-001-A) : la géométrie des
  // pattes suit la position candidate exactement comme elle suivrait un
  // composant réellement posé — aucune seconde géométrie d'assemblage.
  const assembly = useMemo(
    () => resolveAssemblyGeometry(component, breadboard),
    [component, breadboard]
  )
  const bodyClipBottom = getAssemblyProfile(type)?.bodyClip?.bottom ?? null

  if (!def || !component) return null

  return (
    <div
      className={
        "component-insert-ghost" +
        (valid ? " component-insert-ghost--valid" : " component-insert-ghost--invalid")
      }
      aria-hidden="true"
      style={{
        left: component.x,
        top: component.y,
        width: def.width ?? 80,
        height: def.height ?? 40,
      }}
    >
      <AssemblyLeadsLayer geometry={assembly} originX={component.x} originY={component.y} />
      <div
        className="circuit-component__body"
        data-bare-body={presentation.bareBody ? "" : undefined}
        style={
          bodyClipBottom != null
            ? { clipPath: `inset(0 0 ${bodyClipBottom}px 0)` }
            : undefined
        }
      >
        <PartRenderer type={type} uid={GHOST_UID} pinSignals={EMPTY_PIN_SIGNALS} />
      </div>
    </div>
  )
}

export const ComponentInsertGhost = React.memo(ComponentInsertGhostImpl)
