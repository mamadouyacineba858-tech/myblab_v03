// Import React explicite : requis par la config vitest secondaire
// (frontend/src/simulator/vitest.config.ts, sans @vitejs/plugin-react) pour
// tout .jsx rendu sous cette config — même convention que CircuitComponent.jsx
// / Pin.jsx / les Part renderers. Sidebar.test.jsx est le premier test à
// rendre ce composant directement. Ajout d'import pur, aucun changement de
// comportement.
import React, { useCallback, useMemo, useState } from "react"
import { PALETTE_ITEMS } from "../config/componentDefinitions.js"
import { useCircuit } from "../context/useCircuit.js"
import { ComponentPreview } from "./ComponentPreview.jsx"
import "./Sidebar.css"

/**
 * Barre latérale : palette de composants + actions.
 */
export function Sidebar() {
  const {
    addComponent, addBreadboard, clearCircuit, isWiringActive,
    // MB-BREADBOARD-008 (O1/O6) : signale le début/la fin d'un drag HTML5
    // natif depuis la Sidebar — voir useCircuitState.js pour le détail.
    startSidebarComponentDrag, endSidebarComponentDrag,
  } = useCircuit()


  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Tous")
  const categories = ["Tous", "Cartes", "Alimentation", "Entrées", "Sorties", "Composants"]
  const categoryFor = (id) => {
    if (/ARDUINO|ESP32|RASPBERRY|MICROBIT|ATMEGA/.test(id)) return "Cartes"
    if (/LED|DISPLAY|LCD|SEGMENT|BUZZER|SPEAKER|MOTOR|SERVO/.test(id)) return "Sorties"
    if (/BUTTON|SWITCH|LDR|THERMISTOR|POTENTIOMETER|SENSOR|JOYSTICK/.test(id)) return "Entrées"
    if (/BATTERY|POWER|CELL|SOLAR/.test(id)) return "Alimentation"
    return "Composants"
  }
  const visibleItems = useMemo(() => PALETTE_ITEMS.filter(item =>
    (category === "Tous" || categoryFor(item.id) === category) &&
    (item.label + " " + item.id).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [category, search])

  const handlePaletteClick = useCallback((type) => {
    if (type) addComponent(type, 200, 180)
  }, [addComponent])

  // FT-C-BREAD-MULTI-001-D : LOCK-01 levé (001-A). Le bouton reste TOUJOURS
  // actif — l'utilisateur peut ajouter N breadboards. `addBreadboard()` sans
  // argument décale automatiquement chaque nouvelle carte (useCircuitState).
  const handleAddBreadboard = useCallback(() => {
    addBreadboard()
  }, [addBreadboard])

  const handleDragStart = useCallback((e, type) => {
    if (!type) return
    e.dataTransfer.setData("application/myblab-component", type)
    e.dataTransfer.effectAllowed = "copy"
    startSidebarComponentDrag(type)
  }, [startSidebarComponentDrag])

  const handleDragEnd = useCallback(() => {
    endSidebarComponentDrag()
  }, [endSidebarComponentDrag])

  return (
    <aside className="myblab-sidebar">
      <header className="myblab-sidebar__header">
        <h1 className="myblab-sidebar__logo">MYBlab</h1>
        <p className="myblab-sidebar__tagline">Simulateur électronique</p>
      </header>

      <section className="myblab-sidebar__section">
        <h2 className="myblab-sidebar__title">Assemblage</h2>
        <button
          type="button"
          className="myblab-btn myblab-btn--primary"
          onClick={handleAddBreadboard}
        >
          Ajouter un breadboard
        </button>
      </section>

      <section className="myblab-sidebar__section myblab-sidebar__section--scroll">
        <h2 className="myblab-sidebar__title">Composants</h2>
        <label className="myblab-sidebar__search-label" htmlFor="myblab-component-search">Rechercher</label>
        <input id="myblab-component-search" className="myblab-sidebar__search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="LED, Arduino, résistance…" />
        <div className="myblab-sidebar__categories" role="group" aria-label="Catégories de composants">
          {categories.map(name => <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
        <p className="myblab-sidebar__count">{visibleItems.length} composant(s)</p>
        <ul className="myblab-palette">
          {visibleItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="myblab-palette__item"
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                onClick={() => handlePaletteClick(item.id)}
              >
                {/* MB-VIS-LAB-046 : canal générique unique type -> renderer
                    (ComponentPreview.jsx), plus d'exception LED / emoji de
                    repli (I-046-15/16/17). */}
                <ComponentPreview type={item.id} />
                <span className="myblab-palette__label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {visibleItems.length === 0 && <p role="status">Aucun composant trouvé.</p>}
      </section>

      <section className="myblab-sidebar__section">
        <h2 className="myblab-sidebar__title">Câblage</h2>
        <p className="myblab-sidebar__help">
          {isWiringActive
            ? "Cliquez une deuxième pin pour connecter (annuler : clic sur le canvas)"
            : "Cliquez deux pins pour créer un fil"}
        </p>
      </section>

      <footer className="myblab-sidebar__footer">
        <button
          type="button"
          className="myblab-btn myblab-btn--ghost"
          onClick={clearCircuit}
        >
          Effacer le circuit
        </button>
      </footer>
    </aside>
  )
}
