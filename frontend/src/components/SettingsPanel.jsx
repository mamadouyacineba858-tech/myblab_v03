import { useCircuit } from "../context/useCircuit.js"
import "./SettingsPanel.css";

/**
 * Panneau de paramètres : grille, thème.
 */
export function SettingsPanel({ onClose }) {

const { showGrid, toggleGrid, theme, setThemeMode } = useCircuit();


  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <header className="settings-panel__header">
          <h2>Paramètres</h2>
          <button className="settings-panel__close" onClick={onClose}>
            ✕
          </button>
        </header>

        <section className="settings-panel__section">
          <label className="settings-panel__row">
            <span>Afficher la grille</span>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={toggleGrid}
            />
          </label>
        </section>

        <section className="settings-panel__section">
          <span className="settings-panel__label">Thème</span>
          <div className="settings-panel__theme-buttons">
            <button
              className={theme === "dark" ? "active" : ""}
              onClick={() => setThemeMode("dark")}
            >
              🌙 Sombre
            </button>
            <button
              className={theme === "light" ? "active" : ""}
              onClick={() => setThemeMode("light")}
            >
              ☀️ Clair
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}