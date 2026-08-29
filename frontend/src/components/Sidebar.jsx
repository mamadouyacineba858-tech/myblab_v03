import { useCallback } from "react"
import { PALETTE_ITEMS } from "../config/componentDefinitions.js"
import { useCircuit } from "../context/useCircuit.js"
import { LedPart } from "./parts/LedPart.jsx"
import "./Sidebar.css"

/**
 * Barre latérale : palette de composants + actions.
 */
export function Sidebar() {
  const {
    addComponent, addBreadboard, breadboard, clearCircuit, isWiringActive,
    // MB-BREADBOARD-008 (O1/O6) : signale le début/la fin d'un drag HTML5
    // natif depuis la Sidebar — voir useCircuitState.js pour le détail.
    startSidebarComponentDrag, endSidebarComponentDrag,
  } = useCircuit()

  const handlePaletteClick = useCallback((type) => {
    if (type) addComponent(type, 200, 180)
  }, [addComponent])

  // MB-BREADBOARD-003 (limite disclosed héritée de MB-BREADBOARD-002 §5.2,
  // ajout demandé par l'utilisateur en aval du ticket) : addBreadboard()
  // existait déjà dans useCircuitState.js mais n'était accessible que via
  // la console DevTools, faute d'affordance UI. Bouton strictement additif :
  // n'appelle rien d'autre que la commande CommandBus déjà validée et
  // testée (AddBreadboardHandler, LOCK-01). Désactivé/relabellisé quand un
  // breadboard est déjà posé, en cohérence avec LOCK-01 (un seul breadboard
  // par Document, un second addBreadboard() est de toute façon rejeté par
  // le Handler — ce désactivage n'est qu'un confort visuel, pas une
  // nouvelle règle).
  const handleAddBreadboard = useCallback(() => {
    if (!breadboard) addBreadboard()
  }, [addBreadboard, breadboard])

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
          disabled={!!breadboard}
        >
          {breadboard ? "Breadboard posé" : "Ajouter un breadboard"}
        </button>
      </section>

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
                onDragEnd={handleDragEnd}
                onClick={() => handlePaletteClick(item.id)}
              >
                {item.id === "LED" ? (
                  <span className="myblab-palette__icon myblab-palette__icon--led" aria-hidden="true">
                    <span className="myblab-palette__led-preview">
                      <LedPart isOn={false} uid="sidebar-led-preview" />
                    </span>
                  </span>
                ) : (
                  <span className="myblab-palette__icon">{item.icon}</span>
                )}
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
