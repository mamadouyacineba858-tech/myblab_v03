import { useCallback } from "react"
import { PALETTE_ITEMS } from "../config/componentDefinitions.js"
import { useCircuit } from "../context/useCircuit.js"
import "./Sidebar.css"

/**
 * Barre latérale : palette de composants + actions.
 */
export function Sidebar() {
  const { addComponent, clearCircuit, isWiringActive } = useCircuit()

  const handlePaletteClick = useCallback((type) => {
    if (type) addComponent(type, 200, 180)
  }, [addComponent])

  const handleDragStart = useCallback((e, type) => {
    if (!type) return
    e.dataTransfer.setData("application/myblab-component", type)
    e.dataTransfer.effectAllowed = "copy"
  }, [])

  return (
    <aside className="myblab-sidebar">
      <header className="myblab-sidebar__header">
        <h1 className="myblab-sidebar__logo">MYBlab</h1>
        <p className="myblab-sidebar__tagline">Simulateur électronique</p>
      </header>

      <section className="myblab-sidebar__section">
        <h2 className="myblab-sidebar__title">Composants</h2>
        <ul className="myblab-palette">
          {PALETTE_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="myblab-palette__item"
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onClick={() => handlePaletteClick(item.id)}
              >
                <span className="myblab-palette__icon">{item.icon}</span>
                <span className="myblab-palette__label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
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
