import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * MB-UI-AUDIT-002 — audit navigateur non destructif.
 * Aucune action sur les circuits, aucune simulation et aucun test Vitest
 * ne sont déclenchés depuis le navigateur. Les zones non testées sont BLOCKED.
 */
const STRUCTURE = [
  ["shell", "Espace MYBlab", ".myblab-root"],
  ["navbar", "Navigation", ".myblab-navbar"],
  ["palette", "Palette", ".myblab-sidebar"],
  ["canvas", "Canvas", ".simulation-canvas"],
  ["inspector", "Inspecteur", ".component-inspector"],
  ["status", "Barre d'état", ".myblab-statusbar"],
];
const OUT_OF_SCOPE = [
  ["canvas-interactions", "Sélection, déplacement et câblage réels"],
  ["circuit-engine", "Simulation électrique et résultats physiques"],
  ["arduino-firmware", "Compilation et exécution Arduino"],
  ["persistence", "Sauvegarde, restauration et Undo/Redo"],
  ["visual-evidence", "Captures et validation visuelle humaine"],
  ["test-runner", "Suites Vitest, build et lint"],
];
const result = (id, label, status, detail, category) => ({ id, label, status, detail, category });
const visible = el => Boolean(el && el.getClientRects().length > 0);
const style = el => window.getComputedStyle(el);
function luminance(color) {
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return null;
  const rgb = parts.slice(0, 3).map(n => {
    const c = Number(n) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(foreground, background) {
  const a = luminance(foreground), b = luminance(background);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function auditBrowser() {
  const checks = STRUCTURE.map(([id, label, selector]) => {
    const node = document.querySelector(selector);
    return result(id, label, visible(node) ? "PASS" : "FAIL",
      visible(node) ? "Présent et affiché" : "Absent ou masqué", "structure");
  });
  const nav = document.querySelector(".myblab-navbar");
  const settings = nav?.querySelector("button.settings");
  const audit = nav?.querySelector('button[title*="audit"], button[title*="Audit"]');
  const sim = nav?.querySelector("button.play");
  const stop = nav?.querySelector("button.stop");
  for (const [id, label, node] of [
    ["settings-visible", "Bouton Paramètres visible", settings],
    ["audit-visible", "Bouton Audit DEV visible", audit],
    ["simulate-visible", "Commande Simuler visible", sim],
    ["stop-visible", "Commande Arrêter visible", stop],
  ]) {
    checks.push(result(id, label, visible(node) ? "PASS" : "FAIL",
      visible(node) ? "Présent et affiché" : "Absent ou masqué", "controls"));
  }
  const settingsLabel = settings?.textContent?.trim() ?? "";
  checks.push(result("settings-label", "Paramètres : libellé explicite",
    settingsLabel.includes("Paramètres") ? "PASS" : "FAIL",
    settingsLabel || "Aucun libellé", "accessibility"));
  const accessible = settings?.getAttribute("aria-label") || settingsLabel;
  checks.push(result("settings-accessible", "Paramètres : nom accessible",
    accessible?.includes("paramètres") || accessible?.includes("Paramètres") ? "PASS" : "FAIL",
    accessible || "Nom accessible absent", "accessibility"));
  const css = settings ? style(settings) : null;
  const ratio = css ? contrast(css.color, css.backgroundColor) : null;
  checks.push(result("settings-contrast", "Paramètres : contraste du texte (WCAG AA)",
    ratio === null ? "BLOCKED" : ratio >= 4.5 ? "PASS" : "FAIL",
    ratio === null ? "Contraste non calculable (transparence ou couleur non résolue)" : `Ratio ${ratio.toFixed(2)}:1 (seuil 4.5:1)`,
    "accessibility"));
  const bounds = settings?.getBoundingClientRect();
  const inViewport = Boolean(bounds && bounds.width > 0 && bounds.height > 0 &&
    bounds.left >= 0 && bounds.top >= 0 &&
    bounds.right <= window.innerWidth && bounds.bottom <= window.innerHeight);
  checks.push(result("settings-viewport", "Paramètres : entièrement dans la fenêtre",
    inViewport ? "PASS" : "FAIL",
    bounds ? `x=${Math.round(bounds.left)}…${Math.round(bounds.right)}, fenêtre=${window.innerWidth}px` : "Bouton absent",
    "layout"));
  const navBounds = nav?.getBoundingClientRect();
  const navOverflow = Boolean(navBounds && [...nav.querySelectorAll("button")].some(node => {
    const rect = node.getBoundingClientRect();
    return visible(node) && (rect.left < navBounds.left - 1 || rect.right > window.innerWidth + 1);
  }));
  checks.push(result("navbar-overflow", "Navigation : aucun bouton hors écran",
    navOverflow ? "FAIL" : navBounds ? "PASS" : "BLOCKED",
    navOverflow ? "Un ou plusieurs boutons dépassent de la fenêtre" : "Aucun dépassement détecté", "layout"));
  for (const [id, label] of OUT_OF_SCOPE) {
    checks.push(result(id, label, "BLOCKED", "Nécessite un harness de test externe ou une qualification dédiée", "functional"));
  }
  const failed = checks.filter(c => c.status === "FAIL").length;
  return {
    schema: "myblab.dev-audit.v2",
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    scope: "Contrôles DOM, navigation et accessibilité uniquement ; aucune simulation électrique",
    checks,
    totals: { pass: checks.filter(c => c.status === "PASS").length, fail: failed, blocked: checks.filter(c => c.status === "BLOCKED").length },
    verdict: failed ? "PRECHECK_FAIL" : "PRECHECK_ONLY",
    productQualification: "NOT_QUALIFIED",
  };
}
export function DevelopmentAuditPanel({ onClose }) {
  const [report, setReport] = useState(null);
  const [runner, setRunner] = useState(null);
  const [runnerError, setRunnerError] = useState("");
  const [autoOpened, setAutoOpened] = useState(false);
  const lastOpenedRun = useRef(null);
  const run = useCallback(() => setReport(auditBrowser()), []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/__myblab_dev_audit/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Service local HTTP " + response.status);
      setRunner(await response.json());
      setRunnerError("");
    } catch (error) { setRunnerError(String(error.message || error)); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 1500);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const runAll = useCallback(async () => {
    setAutoOpened(false);
    setReport(auditBrowser());
    try {
      const response = await fetch("/__myblab_dev_audit/run", { method: "POST" });
      if (!response.ok) throw new Error("Lancement refusé HTTP " + response.status);
      await refresh();
    } catch (error) { setRunnerError(String(error.message || error)); }
  }, [refresh]);
  const download = useCallback(() => {
    if (runner?.phase !== "DONE") return;
    if (!report && !runner) return;
    const payload = { schema: "myblab.dev-audit.consolidated.v1", exportedAt: new Date().toISOString(),
      browser: report, localRunner: runner, visualAcceptance: "PENDING_HUMAN_REVIEW",
      productQualification: "NOT_QUALIFIED" };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "MYBLAB-DEV-AUDIT-REPORT.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [report, runner]);
  useEffect(() => {
    if (!runner?.id || runner.phase !== "DONE" || lastOpenedRun.current === runner.id) return;
    lastOpenedRun.current = runner.id;
    setAutoOpened(true);
  }, [runner]);
  const viewJson = useCallback(() => {
    if (runner?.phase !== "DONE") return;
    const payload = { schema: "myblab.dev-audit.consolidated.v1", exportedAt: new Date().toISOString(), browser: report, localRunner: runner, visualAcceptance: "PENDING_HUMAN_REVIEW", productQualification: "NOT_QUALIFIED" };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [report, runner]);
  return (
    <section role="dialog" aria-modal="false" aria-label="Audit de développement MYBlab"
      style={{ position: "fixed", right: 16, top: 72, width: "min(520px, calc(100vw - 32px))", maxHeight: "78vh", overflowY: "auto", zIndex: 10000, background: "#14202e", color: "#f8fafc", border: "1px solid #64748b", borderRadius: 12, padding: 18, boxShadow: "0 16px 40px #0006" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <strong>Centre d'audit DEV · provisoire</strong>
        <button type="button" onClick={onClose} aria-label="Fermer l'audit">✕</button>
      </div>
      <p style={{ fontSize: 13 }}>Audit navigateur, tests Arduino/Canvas et compilation locale. Validation visuelle et qualification physique restent distinctes.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={runAll} disabled={runner?.phase === "RUNNING"}>▶ Lancer l'audit automatisé</button>
        <button type="button" onClick={run}>Pré-audit navigateur</button>
        <button type="button" onClick={download} disabled={runner?.phase !== "DONE"}>↓ Télécharger le JSON final</button>
      </div>
      {autoOpened && runner?.phase === "DONE" && <div role="status" style={{ marginTop: 12, padding: 12, border: "1px solid #64748b", borderRadius: 8 }}><strong>Audit terminé : rapport JSON prêt.</strong><p>Le fichier final est maintenant disponible. Aucun téléchargement partiel n’est autorisé.</p><button type="button" onClick={viewJson}>↗ Ouvrir le JSON final dans un nouvel onglet</button></div>}
      {runner?.phase === "RUNNING" && <p role="status">Contrôles en cours : export désactivé jusqu’à la fin de toutes les étapes.</p>}
      {runnerError && <p role="alert" style={{ color: "#fca5a5" }}>STOP : {runnerError}</p>}
      {runner && <div aria-live="polite" style={{ marginTop: 12 }}>
        <p><strong>Tests locaux :</strong> {runner.phase} — {runner.verdict}</p>
        <ul style={{ paddingLeft: 20 }}>
          {runner.steps?.map(step => <li key={step.id}>
            <strong>{step.status}</strong> — {step.label}
            {step.reason && <span> ({step.reason})</span>}
            {step.output && <details><summary>Journal du test</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 11 }}>{step.output}</pre></details>}
          </li>)}
        </ul>
      </div>}
      {report && (
        <div aria-live="polite" style={{ marginTop: 12 }}>
          <p><strong>{report.totals.pass} PASS · {report.totals.fail} FAIL · {report.totals.blocked} NON QUALIFIÉS</strong></p>
          <p>Verdict : {report.verdict} — qualification produit : NON ACQUISE</p>
          <ul style={{ paddingLeft: 20 }}>
            {report.checks.map(c => <li key={c.id}><strong>{c.status}</strong> — {c.label} : {c.detail}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
