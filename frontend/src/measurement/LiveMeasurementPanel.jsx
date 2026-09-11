import React, { useMemo } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { MeasurementPanel } from "./MeasurementPanel.jsx"
import "./LiveMeasurementPanel.css"

/**
 * LiveMeasurementPanel — MB-MEASURE-002.
 *
 * Couche d'intégration Presentation UNIQUEMENT entre l'application live et
 * l'instrument déjà validé (`MeasurementPanel.jsx`, MB-MEASURE-001) :
 *
 *   App / Navbar
 *        ↓
 *   LiveMeasurementPanel   ← ce fichier
 *        ↓ (components, wires, targets — aucun calcul)
 *   MeasurementPanel       ← inchangé, measure() -> observe() -> Simulation
 *
 * Ce fichier :
 * - ne calcule AUCUNE mesure, AUCUNE physique (T12/AC-11) ;
 * - n'importe JAMAIS resolution.js, preparation.js, dcContributionRegistry.js,
 *   canonicalRegistry.js ni engine.js ;
 * - dérive uniquement la liste de targets utilisateur (PIN) à partir des
 *   composants réellement présents, via `componentDefinitions.js`
 *   (source Presentation déjà utilisée par Sidebar.jsx/Pin.jsx/
 *   ComponentInspector.jsx pour énumérer les pins d'un type — jamais
 *   `canonicalRegistry.js`, la source Simulation/identité électrique) ;
 * - ne mute jamais le Document (§5) : `components`/`wires` sont lus tels
 *   quels depuis le contexte, jamais recopiés durablement dans un état
 *   métier local — le seul état local de ce fichier est délégué à
 *   `MeasurementPanel` lui-même (mode/target/dernier résultat, déjà
 *   Presentation-only depuis MB-MEASURE-001).
 *
 * Isolation de performance (§6, MB-VIS-CANVAS-051) : ce composant n'est
 * monté QUE lorsque l'utilisateur ouvre le panneau (voir Navbar.jsx,
 * `{measurementOpen && <LiveMeasurementPanel .../>}`) — le coût de
 * souscription à `useCircuitInteraction()` (contexte haute fréquence,
 * nécessaire pour lire `components` à jour) n'existe donc jamais tant que
 * l'instrument est fermé. `wires`, lui, est lu depuis le contexte STABLE
 * (`useCircuit()`) — il n'y a pas de second `wires` haute fréquence dans ce
 * dépôt (voir CircuitContext.jsx : `wires` est déjà exposé par `stableValue`).
 */
export function LiveMeasurementPanel({ onClose }) {
  const { wires } = useCircuit()
  const { components } = useCircuitInteraction()

  const targets = useMemo(() => {
    const list = []
    for (const component of components) {
      const def = getComponentDef(component.type)
      const pins = def?.pins ?? []
      for (const pin of pins) {
        list.push({
          kind: "PIN",
          componentUid: component.uid,
          pinId: pin.id,
          label: `${def?.label ?? component.type} · ${pin.label ?? pin.id}`,
        })
      }
    }
    return list
  }, [components])

  return (
    <div className="measurement-overlay" onClick={onClose}>
      <div className="measurement-live-panel" onClick={(e) => e.stopPropagation()}>
        <header className="measurement-live-panel__header">
          <h2>Mesures</h2>
          <button className="measurement-live-panel__close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <MeasurementPanel components={components} wires={wires} targets={targets} time={0} />
      </div>
    </div>
  )
}
