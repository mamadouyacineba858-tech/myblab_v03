import React, { useState, useEffect, useCallback } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"
import { resolveComponentParameters, isFixedParameter } from "../simulator/resolveComponentParameters.js"
import "./ComponentInspector.css"

/**
 * ComponentInspector — MB-L1-CVE-001.
 *
 * Presentation UNIQUEMENT (CV-04) : lit exclusivement le contexte STABLE
 * (`useCircuit()`, jamais `useCircuitInteraction()`/`CircuitInteractionContext`
 * — CV-15/AC-19) et affiche/édite les paramètres du composant sélectionné
 * via `selectedComponent` (projection stable, dérivée du Document persistant
 * + activeItem, jamais componentsForRender/dragPreview).
 *
 * Généricité stricte (CV-16) : ce fichier ne contient AUCUNE comparaison
 * `type === "X"`. Le contenu affiché est entièrement dérivé de
 * `canonicalRegistry.parameterSchema` — un composant sans modèle de
 * simulation (LED, ARDUINO, BUTTON, ...) affiche un message neutre, un
 * composant avec un paramètre figé (minimum === maximum, ex. pile 1.5 V)
 * l'affiche en lecture seule (§15 du ticket), sans branche par type.
 */
export function ComponentInspector() {
  const { selectedComponent, updateComponentParameters } = useCircuit()

  if (!selectedComponent) {
    return (
      <aside className="component-inspector">
        <header className="component-inspector__header">
          <h2>Propriétés</h2>
        </header>
        <p className="component-inspector__empty">Aucun composant sélectionné</p>
      </aside>
    )
  }

  const def = getComponentDef(selectedComponent.type)
  const entry = getCanonicalEntry(selectedComponent.type)
  const schema = entry?.parameterSchema ?? null
  const effective = resolveComponentParameters(selectedComponent.type, selectedComponent.parameters)

  return (
    <aside className="component-inspector">
      <header className="component-inspector__header">
        <h2>Propriétés</h2>
        <p className="component-inspector__component-name">{def?.label ?? selectedComponent.type}</p>
      </header>

      {!schema || schema.length === 0 ? (
        <p className="component-inspector__empty">Aucun paramètre configurable pour ce composant</p>
      ) : (
        <div className="component-inspector__params">
          {schema.map((paramDef) => (
            <ParameterRow
              key={paramDef.key}
              type={selectedComponent.type}
              paramDef={paramDef}
              value={effective[paramDef.key]}
              onCommit={(nextValue) =>
                updateComponentParameters(selectedComponent.uid, { [paramDef.key]: nextValue })
              }
            />
          ))}
        </div>
      )}
    </aside>
  )
}

function ParameterRow({ type, paramDef, value, onCommit }) {
  const fixed = isFixedParameter(type, paramDef.key)
  const [draft, setDraft] = useState(String(value))

  // Le draft local reste synchronisé avec la valeur effective réelle tant
  // que l'utilisateur n'est pas en train de taper (évite d'écraser une
  // frappe en cours si une mise à jour externe survenait, ex. Undo/Redo).
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = useCallback(() => {
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed !== value) {
      onCommit(parsed)
    } else {
      setDraft(String(value))
    }
  }, [draft, value, onCommit])

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
    } else if (e.key === "Escape") {
      setDraft(String(value))
      e.currentTarget.blur()
    }
  }, [value])

  return (
    <label className="component-inspector__param">
      <span className="component-inspector__param-label">{paramDef.description ?? paramDef.key}</span>
      <span className="component-inspector__param-row">
        {fixed ? (
          <span className="component-inspector__param-fixed-value">{value}</span>
        ) : (
          <input
            type="number"
            className="component-inspector__param-input"
            value={draft}
            min={paramDef.minimum}
            max={paramDef.maximum}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
        )}
        {paramDef.unit ? <span className="component-inspector__param-unit">{paramDef.unit}</span> : null}
      </span>
    </label>
  )
}
