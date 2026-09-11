// Import React explicite : requis par la config vitest secondaire
// (frontend/src/simulator/vitest.config.ts, sans @vitejs/plugin-react) pour
// tout .jsx rendu sous cette config — même convention que Sidebar.jsx /
// CircuitComponent.jsx / ComponentPreview.jsx. Navbar.jsx n'avait jamais été
// rendu directement sous cette config avant LaboratoryWorkspaceCohesion.test.jsx
// (MB-VIS-LAB-046). Ajout d'import pur, aucun changement de comportement.
import React, { useRef, useState, useCallback } from "react";
import { useCircuit } from "../context/useCircuit.js"
import { SettingsPanel } from "./SettingsPanel.jsx";
import { LiveMeasurementPanel } from "../measurement/LiveMeasurementPanel.jsx";
import "./Navbar.css";
export function Navbar() {
  const {
    simulationActive,
    startSimulation,
    stopSimulation,
    zoomIn,
    zoomOut,
    // MB-VIS-CANVAS-050 : navigation de viewport.
    resetViewport,
    fitToContent,
    fitToSelection,
    exportCircuit,
    importCircuit,
    clearCircuit,
  } = useCircuit();

  const fileInputRef = useRef(null);
const [settingsOpen, setSettingsOpen] = useState(false);
  // MB-MEASURE-002 : panneau léger, monté uniquement lorsqu'ouvert (§6 du
  // ticket) — aucun coût de souscription au contexte haute fréquence
  // (useCircuitInteraction, nécessaire à LiveMeasurementPanel pour lire
  // `components` à jour) tant que l'instrument est fermé.
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const handleNew = useCallback(() => {
    
    const confirmed = window.confirm(
      "Créer un nouveau circuit ? Le circuit actuel non sauvegardé sera perdu."
    );
    if (confirmed) {
      clearCircuit();
    }
  }, [clearCircuit]);

  const handleSave = useCallback(async () => {
    const data = exportCircuit();
    const json = JSON.stringify(data, null, 2);

    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "circuit-myblab.json",
          types: [
            {
              description: "Fichier circuit MYBlab",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "circuit-myblab.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportCircuit]);

  const handleOpenClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          importCircuit(data);
        } catch {
          alert("Fichier invalide : impossible de charger ce circuit.");
        }
      };
      reader.readAsText(file);

      e.target.value = "";
    },
    [importCircuit]
  );

  return (
    <header className="myblab-navbar">
      <div className="navbar-logo">
        🧪 <span>MYBlab</span>
      </div>

      <nav className="navbar-actions">
        <button onClick={handleNew}>Nouveau</button>
        <button onClick={handleOpenClick}>Ouvrir</button>
        <button onClick={handleSave}>Sauvegarder</button>

        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div className="separator"></div>

        <button
          className="play"
          onClick={startSimulation}
          disabled={simulationActive}
        >
          ▶ Simuler
        </button>
        <button
          className="stop"
          onClick={stopSimulation}
          disabled={!simulationActive}
        >
          ■ Arrêter
        </button>

        <div className="separator"></div>

        <button onClick={zoomIn} title="Zoom avant">＋</button>
        <button onClick={zoomOut} title="Zoom arrière">－</button>

        <div className="separator"></div>

        {/* MB-VIS-CANVAS-050 : navigation de viewport (pan lui-même se
            déclenche au clic molette directement sur le Canvas, sans bouton
            dédié — voir SimulationCanvas.jsx). */}
        <button onClick={resetViewport} title="Réinitialiser la vue">⤾ Vue</button>
        <button onClick={fitToContent} title="Ajuster au contenu">⛶ Contenu</button>
        <button onClick={fitToSelection} title="Ajuster à la sélection">⛶ Sélection</button>

        <div className="separator"></div>

        <button
          className="measurement"
          onClick={() => setMeasurementOpen(true)}
          title="Mesures"
        >
          📊 Mesures
        </button>

        <button
          className="settings"
          onClick={() => setSettingsOpen(true)}
          title="Paramètres"
        >
          ⚙
        </button>
      </nav>
      {settingsOpen && (
  <SettingsPanel onClose={() => setSettingsOpen(false)} />
)}
      {measurementOpen && (
  <LiveMeasurementPanel onClose={() => setMeasurementOpen(false)} />
)}
    </header>
  );
}