import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Audit DEV only. Optical DOM magnifier and measurable geometry checks.
 * Read-only: never changes the circuit, wiring, simulation or source assets.
 * The preview is a cloned DOM snapshot, not a pixel-level image comparison.
 */
const rectData = rect => ({ x: +rect.x.toFixed(2), y: +rect.y.toFixed(2), width: +rect.width.toFixed(2), height: +rect.height.toFixed(2) })
const findComponents = () => [...document.querySelectorAll('.circuit-component')].filter(el => !el.closest('[data-visual-microscope]'))
const nodeName = (el, index) => {
  const type = el.getAttribute('data-component-type') || el.getAttribute('data-type') || el.querySelector('[class*="part-"]')?.className?.toString().split(' ').find(x => x.startsWith('part-')) || 'Composant'
  return `${index + 1}. ${type}`
}
function inspect(el) {
  const issues = []
  const body = el.querySelector('.circuit-component__body') || el
  const bodyRect = body.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) issues.push({ severity: 'ERROR', code: 'EMPTY_BOX', message: 'Boîte du composant vide ou invisible' })
  if (bodyRect.width < 1 || bodyRect.height < 1) issues.push({ severity: 'ERROR', code: 'EMPTY_BODY', message: 'Corps visuel absent' })
  const images = [...el.querySelectorAll('img')]
  images.forEach((img, index) => {
    if (!img.complete) issues.push({ severity: 'PENDING', code: 'IMAGE_LOADING', message: `Image ${index + 1} en chargement` })
    else if (img.naturalWidth === 0 || img.naturalHeight === 0) issues.push({ severity: 'ERROR', code: 'BROKEN_IMAGE', message: `Image ${index + 1} non chargée : ${img.currentSrc || img.src}` })
    const r = img.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) issues.push({ severity: 'WARNING', code: 'INVISIBLE_IMAGE', message: `Image ${index + 1} de taille nulle` })
    if (img.naturalWidth && img.naturalHeight && r.width && r.height) {
      const natural = img.naturalWidth / img.naturalHeight
      const displayed = r.width / r.height
      if (Math.abs(natural / displayed - 1) > 0.12 && getComputedStyle(img).objectFit === 'fill') {
        issues.push({ severity: 'WARNING', code: 'IMAGE_STRETCH', message: `Image ${index + 1} : déformation géométrique potentielle (${(100 * Math.abs(natural / displayed - 1)).toFixed(1)} %)` })
      }
    }
  })
  const contacts = [...el.querySelectorAll('[data-wire-pin]')]
  const seen = new Set()
  contacts.forEach(pin => {
    const id = [pin.getAttribute('data-wire-pin'), pin.getAttribute('data-wire-contact')].join('/')
    if (seen.has(id)) issues.push({ severity: 'WARNING', code: 'DUPLICATE_CONTACT', message: `Contact présenté plusieurs fois : ${id}` })
    seen.add(id)
    const p = pin.getBoundingClientRect()
    if (!Number.isFinite(p.x + p.y) || p.width < 1 || p.height < 1) issues.push({ severity: 'ERROR', code: 'CONTACT_BOX', message: `Zone de contact invalide : ${id}` })
  })
  if (!contacts.length) issues.push({ severity: 'WARNING', code: 'NO_VISIBLE_CONTACT', message: 'Aucune cible de contact trouvée dans le DOM (à vérifier selon le composant)' })
  return { timestamp: new Date().toISOString(), name: nodeName(el, findComponents().indexOf(el)), component: rectData(rect), body: rectData(bodyRect), imageCount: images.length, contacts: contacts.map(pin => ({ pin: pin.getAttribute('data-wire-pin'), contact: pin.getAttribute('data-wire-contact'), bounds: rectData(pin.getBoundingClientRect()) })), issues, verdict: issues.some(x => x.severity === 'ERROR') ? 'ANOMALY' : issues.length ? 'REVIEW' : 'NO_AUTOMATIC_ANOMALY', qualification: 'VISUAL_HUMAN_REVIEW_REQUIRED' }
}
export function ComponentVisualMicroscope() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(0)
  const [zoom, setZoom] = useState(5)
  const [result, setResult] = useState(null)
  const [revision, setRevision] = useState(0)
  const stage = useRef(null)
  const refresh = useCallback(() => {
    const found = findComponents()
    setItems(found.map((el, index) => ({ label: nodeName(el, index), index })))
    setSelected(i => Math.min(i, Math.max(0, found.length - 1)))
    setRevision(n => n + 1)
  }, [])
  useEffect(() => { refresh() }, [refresh])
  const current = useMemo(() => findComponents()[selected] || null, [selected, revision])
  useEffect(() => {
    const host = stage.current
    if (!host) return
    host.replaceChildren()
    if (!current) { setResult(null); return }
    const snapshot = current.cloneNode(true)
    snapshot.querySelectorAll('button, input, select, textarea').forEach(el => { el.tabIndex = -1; el.disabled = true })
    snapshot.removeAttribute('id')
    snapshot.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'))
    snapshot.style.position = 'relative'
    snapshot.style.left = '0'
    snapshot.style.top = '0'
    snapshot.style.transform = 'none'
    snapshot.style.pointerEvents = 'none'
    snapshot.style.margin = '0'
    host.appendChild(snapshot)
    setResult(inspect(current))
  }, [current])
  const save = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify({ schema: 'myblab.visual-microscope.v1', zoom, ...result }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'MYBLAB-VISUAL-MICROSCOPE.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  return <section data-visual-microscope="true" aria-label="Microscope visuel des composants" style={{ marginTop: 18, borderTop: '1px solid #64748b', paddingTop: 14 }}>
    <h3 style={{ margin: '0 0 8px' }}>🔬 Microscope visuel — composants</h3>
    <p style={{ fontSize: 12 }}>Grossissement optique DOM de 1× à 12×. Analyse des images, dimensions et contacts. Une anomalie absente de cette liste n'est pas une preuve de perfection graphique.</p>
    <button type="button" onClick={refresh}>↻ Rechercher les composants du Canvas</button>
    {items.length ? <>
      <label style={{ display: 'block', marginTop: 10 }}>Composant à examiner
        <select aria-label="Composant à examiner" value={selected} onChange={e => setSelected(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 7 }}>
          {items.map(item => <option key={item.index} value={item.index}>{item.label}</option>)}
        </select>
      </label>
      <label style={{ display: 'block', marginTop: 10 }}>Grossissement : {zoom}×
        <input aria-label="Grossissement" type="range" min="1" max="12" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ display: 'block', width: '100%' }} />
      </label>
      <div style={{ height: 300, overflow: 'auto', background: '#f1f5f9', border: '1px solid #94a3b8', borderRadius: 8, marginTop: 10, padding: 20 }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'max-content', height: 'max-content' }}>
          <div ref={stage} style={{ position: 'relative', isolation: 'isolate' }} />
        </div>
      </div>
      <button type="button" onClick={() => current && setResult(inspect(current))} style={{ marginTop: 10 }}>Analyser à nouveau</button>
      <button type="button" onClick={save} disabled={!result} style={{ marginLeft: 8 }}>↓ Rapport visuel JSON</button>
      {result && <div aria-live="polite" style={{ marginTop: 8, fontSize: 13 }}>
        <strong>Diagnostic : {result.verdict}</strong>
        <p>{result.imageCount} image(s) · {result.contacts.length} cible(s) de contact · {result.issues.length} observation(s)</p>
        <ul style={{ paddingLeft: 20 }}>{result.issues.map((issue, index) => <li key={index}><strong>{issue.severity}</strong> — {issue.message}</li>)}</ul>
        <p>Contrôle optique humain et comparaison pixel à pixel avec une référence : non encore qualifiés.</p>
      </div>}
    </> : <p>Aucun composant sur le Canvas. Ajoutez-en un depuis la palette, puis cliquez sur « Rechercher ».</p>}
  </section>
}
