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
  const [clock, setClock] = useState(Date.now());
  const [runnerError, setRunnerError] = useState("");
  const [autoOpened, setAutoOpened] = useState(false);
  const lastOpenedRun = useRef(null);
  const reportTab = useRef(null);
  const auditStartedHere = useRef(false);
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
    const timer = window.setInterval(() => { setClock(Date.now()); void refresh(); }, 1500);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const runAll = useCallback(async () => {
    setAutoOpened(false);
    // Open a same-origin placeholder synchronously from the user gesture;
    // browsers may block a new tab opened later by an async polling effect.
    if (!reportTab.current || reportTab.current.closed) {
      reportTab.current = window.open("about:blank", "_blank");
    }
    if (reportTab.current) {
      reportTab.current.document.title = "MYBlab — audit en cours";
      reportTab.current.document.body.textContent = "MYBlab : audit en cours. Le JSON final apparaîtra ici automatiquement après tous les contrôles.";
    }
    auditStartedHere.current = true;
    setReport(auditBrowser());
    try {
      const response = await fetch("/__myblab_dev_audit/run", { method: "POST" });
      if (!response.ok) throw new Error("Lancement refusé HTTP " + response.status);
      await refresh();
    } catch (error) {
      auditStartedHere.current = false;
      if (reportTab.current && !reportTab.current.closed) reportTab.current.document.body.textContent = "Audit non démarré : " + String(error.message || error);
      setRunnerError(String(error.message || error));
    }
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
    if (!auditStartedHere.current || !runner?.id || runner.phase !== "DONE" || lastOpenedRun.current === runner.id) return;
    lastOpenedRun.current = runner.id;
    auditStartedHere.current = false;
    setAutoOpened(true);
    const payload = { schema: "myblab.dev-audit.consolidated.v1", exportedAt: new Date().toISOString(),
      browser: report, localRunner: runner, visualAcceptance: "PENDING_HUMAN_REVIEW",
      productQualification: "NOT_QUALIFIED" };
    const json = JSON.stringify(payload, null, 2);
    const tab = reportTab.current;
    if (tab && !tab.closed) {
      // Render JSON as plain text in the pre-opened tab, never as HTML.
      tab.document.title = "MYBLAB-DEV-AUDIT-REPORT.json";
      tab.document.body.replaceChildren();
      const pre = tab.document.createElement("pre");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.overflowWrap = "anywhere";
      pre.textContent = json;
      tab.document.body.appendChild(pre);
      tab.focus();
    }
  }, [runner, report]);
  const viewJson = useCallback(() => {
    if (runner?.phase !== "DONE") return;
    const payload = { schema: "myblab.dev-audit.consolidated.v1", exportedAt: new Date().toISOString(), browser: report, localRunner: runner, visualAcceptance: "PENDING_HUMAN_REVIEW", productQualification: "NOT_QUALIFIED" };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [report, runner]);
  const running = runner?.phase === "RUNNING";
  const finished = runner?.phase === "DONE";
  const passed = runner?.steps?.filter(step => step.status === "PASS").length ?? 0;
  const completed = runner?.steps?.filter(step => ["PASS", "FAIL"].includes(step.status)).length ?? 0;
  const total = runner?.steps?.length ?? 0;
  const current = runner?.steps?.find(step => step.status === "RUNNING");
  const failures = runner?.steps?.filter(step => step.status === "FAIL") ?? [];
  const elapsed = runner?.startedAt ? Math.max(0, Math.floor((clock - Date.parse(runner.startedAt)) / 1000)) : 0;
  const elapsedLabel = `${Math.floor(elapsed / 60)} min ${String(elapsed % 60).padStart(2, "0")} s`;
  const activityAge = current?.lastOutputAt ? Math.max(0, Math.floor((clock - Date.parse(current.lastOutputAt)) / 1000)) : null;
  return (
    <section role="dialog" aria-modal="false" aria-label="Contrôle MYBlab"
      style={{ position: "fixed", right: 16, top: 72, width: "min(490px, calc(100vw - 32px))",
        maxHeight: "min(75vh, 650px)", overflowY: "auto", zIndex: 10000,
        background: "#14202e", color: "#f8fafc", border: "1px solid #64748b",
        borderRadius: 12, padding: 18, boxShadow: "0 16px 40px #0006" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <strong style={{ fontSize: 20 }}>Contrôle de MYBlab</strong>
        <button type="button" onClick={onClose} aria-label="Fermer le contrôle">✕</button>
      </div>
      <p style={{ lineHeight: 1.5 }}>Vérifie le logiciel et prépare automatiquement un rapport à me transmettre.</p>
      <button type="button" onClick={runAll} disabled={running}
        style={{ padding: "12px 16px", fontSize: 16, fontWeight: 700, width: "100%",
          cursor: running ? "wait" : "pointer" }}>
        {running ? "⏳ Contrôle en cours…" : "▶ Démarrer le contrôle complet"}
      </button>
      {running && <div role="status" aria-live="polite" style={{ marginTop: 16 }}>
        <strong>Contrôle en cours — le logiciel travaille.</strong>
        <p>{current ? current.label : "Préparation des contrôles…"}</p>
        <p>Temps écoulé : <strong>{elapsedLabel}</strong></p>
        <p>{completed} étape(s) terminée(s) sur {total} ({passed} réussie(s), {failures.length} en échec).</p>
        <progress aria-label="Progression des étapes terminées" value={completed} max={Math.max(1, total)} style={{ width: "100%", height: 16 }} />
        <div aria-label="Activité du contrôle en cours" style={{ height: 6, background: "#334155", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
          <div style={{ width: "35%", height: "100%", background: "#38bdf8", borderRadius: 8, animation: "myblabAuditActivity 1.8s ease-in-out infinite alternate" }} />
        </div>
        <style>{`@keyframes myblabAuditActivity { from { transform: translateX(0); } to { transform: translateX(185%); } }`}</style>
        <p style={{ fontSize: 13 }}>Animation = contrôle actif, pas pourcentage de tests exécutés.</p>
        {current && <p style={{ fontSize: 13 }}>Étape commencée : {current.startedAt ? new Date(current.startedAt).toLocaleTimeString() : "en cours"}{activityAge != null ? ` · Dernière sortie du test : il y a ${activityAge} s` : " · En attente des premiers résultats du test"}</p>}
        {activityAge != null && activityAge > 90 && <p role="alert" style={{ color: "#fbbf24" }}>Aucune nouvelle sortie depuis plus de 90 secondes. Le contrôle peut être lent ou bloqué ; il s’arrêtera si son délai maximal est dépassé.</p>}
        <p style={{ fontSize: 13 }}>Le rapport final apparaîtra automatiquement dans l'onglet ouvert au démarrage.</p>
      </div>}
      {finished && <div role="status" aria-live="polite" style={{ marginTop: 16 }}>
        <strong style={{ fontSize: 17 }}>{failures.length ? "⚠ Contrôle terminé : des problèmes ont été détectés." : "✓ Contrôle automatique terminé."}</strong>
        <p>{passed} étape(s) réussie(s) sur {total}. {failures.length ? `${failures.length} étape(s) en échec.` : ""}</p>
        <p>Le rapport complet est prêt dans l'onglet du navigateur.</p>
        <button type="button" onClick={viewJson}>↗ Voir le rapport complet</button>
        <button type="button" onClick={download} style={{ marginLeft: 8 }}>↓ Enregistrer le rapport</button>
        <p style={{ fontSize: 13 }}>Les contrôles visuels et physiques nécessitent encore une validation séparée.</p>
      </div>}
      {!running && !finished && <p style={{ fontSize: 13 }}>Un nouvel onglet affichera le rapport lorsque le contrôle sera terminé.</p>}
      {runnerError && <p role="alert" style={{ color: "#fca5a5" }}>Impossible de poursuivre : {runnerError}</p>}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Afficher les détails techniques (facultatif)</summary>
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={run}>Vérifier uniquement l'affichage</button>
          <p>État du contrôle : {runner?.phase ?? "non démarré"} — {runner?.verdict ?? "aucun résultat"}</p>
          <ul style={{ paddingLeft: 20 }}>
            {runner?.steps?.map(step => <li key={step.id}>
              <strong>{step.status}</strong> — {step.label}
              {step.reason && <span> ({step.reason})</span>}
              {step.output && <details><summary>Journal du test</summary>
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 11 }}>{step.output}</pre>
              </details>}
            </li>)}
          </ul>
          {report && <>
            <p>{report.totals.pass} réussites, {report.totals.fail} échecs, {report.totals.blocked} contrôles non réalisés dans le navigateur.</p>
            <ul style={{ paddingLeft: 20 }}>
              {report.checks.map(c => <li key={c.id}><strong>{c.status}</strong> — {c.label} : {c.detail}</li>)}
            </ul>
          </>}
        </div>
      </details>
    </section>
  );
}
