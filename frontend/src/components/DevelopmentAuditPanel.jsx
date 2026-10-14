import React, { useCallback, useState } from "react";

/**
 * MB-UI-AUDIT-001 — contrôles DOM locaux non destructifs.
 * Ne prétend PAS exécuter Vitest, qualifier le moteur électrique ou
 * remplacer l'audit visuel humain. Les preuves sont exportables en JSON.
 */
const CHECKS = [
  { id: "shell", label: "Espace MYBlab visible", selector: ".myblab-root" },
  { id: "navbar", label: "Barre de navigation", selector: ".myblab-navbar" },
  { id: "palette", label: "Palette de composants", selector: ".myblab-sidebar" },
  { id: "canvas", label: "Zone de simulation", selector: ".simulation-canvas" },
  { id: "inspector", label: "Inspecteur de composants", selector: ".component-inspector" },
  { id: "status", label: "Barre d'état", selector: ".myblab-statusbar" },
];

function runChecks() {
  return CHECKS.map(({ id, label, selector }) => {
    const element = document.querySelector(selector);
    const visible = Boolean(element && element.getClientRects().length > 0);
    return { id, label, status: visible ? "PASS" : "FAIL", detail: visible ? "Élément présent et affiché" : "Élément absent ou masqué" };
  });
}

export function DevelopmentAuditPanel({ onClose }) {
  const [report, setReport] = useState(null);
  const run = useCallback(() => {
    setReport({
      schema: "myblab.ui-smoke.v1",
      timestamp: new Date().toISOString(),
      location: window.location.pathname,
      scope: "DOM visible uniquement — ni simulation électrique ni tests Vitest",
      checks: runChecks(),
      verdict: "PRECHECK_ONLY",
    });
  }, []);
  const download = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "MYBLAB-UI-AUDIT-PRECHECK.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <section role="dialog" aria-modal="false" aria-label="Audit de développement MYBlab"
      style={{ position: "fixed", right: 16, top: 72, width: "min(420px, calc(100vw - 32px))", maxHeight: "75vh", overflowY: "auto", zIndex: 10000, background: "#14202e", color: "#f8fafc", border: "1px solid #64748b", borderRadius: 12, padding: 18, boxShadow: "0 16px 40px #0006" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <strong>Audit de développement · provisoire</strong>
        <button type="button" onClick={onClose} aria-label="Fermer l'audit">✕</button>
      </div>
      <p style={{ fontSize: 13 }}>Contrôle automatique non destructif de l'interface. Les tests du simulateur, l'audit visuel et les circuits Arduino restent des qualifications séparées.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={run}>▶ Lancer le pré-audit</button>
        <button type="button" onClick={download} disabled={!report}>↓ Exporter JSON</button>
      </div>
      {report && (
        <div aria-live="polite" style={{ marginTop: 12 }}>
          <p><strong>Pré-audit :</strong> {report.checks.filter(c => c.status === "PASS").length}/{report.checks.length} contrôles DOM réussis — <strong>pas de PASS produit</strong></p>
          <ul style={{ paddingLeft: 20 }}>
            {report.checks.map(c => <li key={c.id}>{c.status === "PASS" ? "✓" : "✕"} {c.label} — {c.detail}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
