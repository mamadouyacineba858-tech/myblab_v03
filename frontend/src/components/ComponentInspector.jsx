import React, { useState, useEffect, useCallback, useRef } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"
import { resolveComponentParameters, isFixedParameter } from "../simulator/resolveComponentParameters.js"
import { resolveComponentProperties, validateComponentProperties } from "../config/componentProperties.js"
import "./ComponentInspector.css"

/** Product identity and electrical parameters use independent schemas and
 * mutation actions from the stable circuit context. Control selection is
 * declarative; canonical component labels remain visible in the header. */
export function ComponentInspector() {
  const { selectedComponent, updateComponentParameters, updateComponentProperties } = useCircuit()

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
  const properties = resolveComponentProperties(selectedComponent.type, selectedComponent.properties)
  const entry = getCanonicalEntry(selectedComponent.type)
  const schema = entry?.parameterSchema ?? null
  const effective = resolveComponentParameters(selectedComponent.type, selectedComponent.parameters)

  return (
    <aside className="component-inspector">
      <header className="component-inspector__header">
        <h2>Propriétés</h2>
        <p className="component-inspector__component-name">{def?.label ?? selectedComponent.type}</p>
      </header>

      <section className="component-inspector__section" aria-label="Identité">
        <h3>Identité</h3>
        <div className="component-inspector__params">
          {Object.entries(def?.propertySchema ?? {}).map(([propertyKey, definition]) => (
            <PropertyField
              key={`${selectedComponent.uid}:${propertyKey}`}
              definition={definition}
              value={properties[propertyKey]}
              onCommit={(nextValue) => {
                const candidate = { ...properties, [propertyKey]: nextValue }
                if (!validateComponentProperties(selectedComponent.type, candidate).valid) return false
                updateComponentProperties(selectedComponent.uid, { [propertyKey]: nextValue })
                return true
              }}
            />
          ))}
        </div>
      </section>

      <section className="component-inspector__section" aria-label="Paramètres électriques">
        <h3>Paramètres électriques</h3>
        {!schema || schema.length === 0 ? (
          <p className="component-inspector__empty">Aucun paramètre électrique configurable</p>
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
      </section>
    </aside>
  )
}

// Add future controls here by schema.control, never by component type.
export function PropertyField({ definition, value, onCommit }) {
  const [draft, setDraft] = useState(value ?? "")
  const cancelBlur = useRef(false)
  useEffect(() => { setDraft(value ?? "") }, [value])

  const commit = () => {
    if (cancelBlur.current) {
      cancelBlur.current = false
      setDraft(value ?? "")
      return
    }
    if (draft === value || onCommit(draft) === false) setDraft(value ?? "")
  }

  return (
    <label className="component-inspector__param">
      <span className="component-inspector__param-label">{definition.label}</span>
      {definition.control === "text" ? (
        <input
          type="text"
          className="component-inspector__param-input"
          value={draft}
          maxLength={definition.maxLength}
          onChange={(event) => { cancelBlur.current = false; setDraft(event.target.value) }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.currentTarget.blur()
            } else if (event.key === "Escape") {
              event.preventDefault()
              cancelBlur.current = true
              setDraft(value ?? "")
              event.currentTarget.blur()
            }
          }}
        />
      ) : (
        <span className="component-inspector__param-fixed-value" title="Contrôle non disponible">{String(value ?? "")}</span>
      )}
    </label>
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
