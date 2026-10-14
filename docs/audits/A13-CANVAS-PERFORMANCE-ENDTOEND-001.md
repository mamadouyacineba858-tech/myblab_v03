# A13 — Audit transversal de performance Canvas — 2026-10-11

## Portée et état de preuve
Inspection statique du code sur la branche `codex/A13-VISUAL-CORR-004`. Aucun profilage Chrome réel, benchmark FPS ni exécution de Vitest/build n'a été effectué par cet audit. Ne pas annoncer « fluidité Tinkercad PASS » avant la qualification navigateur.

## Cartographie vérifiée
| Sous-système | Source canonique | Observation | Risque / action |
| --- | --- | --- | --- |
| Pointeur / pan / drag / marquee | `frontend/src/hooks/useCircuitState.js` | listeners window pointermove/up/cancel; viewportRef et wirePathsRef protègent contre les réabonnements à chaque pixel | mesurer les temps par frame et vérifier les chemins drag/sidebar |
| Zoom | `frontend/src/canvas/SimulationCanvas.jsx`, `frontend/src/utils/viewport.js` | un seul zoom-layer transform translate+scale; wheel passive:false, ancrage curseur | mesurer wheel et préserver la conversion screen/document |
| Composants | `frontend/src/canvas/CircuitComponent.jsx`, `frontend/src/canvas/Pin.jsx` | CircuitComponent React.memo; Pin anciennement useState par hover + title navigateur | remplacé par CSS : pas de setState hover par pin |
| Breadboard | `frontend/src/canvas/Breadboard.jsx` | plusieurs centaines de circles SVG, occupation/association mémoïsées | un seul tooltip SVG; délégation pointermove; vérifier les coûts de rerender parent et le hit-test |
| Fils | `frontend/src/wires/WiresLayer.jsx`, `frontend/src/wires/BreadboardWiresLayer.jsx` | couches séparées, `wirePaths` alimenté par interaction | instrumenter la dérivation de chemins pendant drag |
| Tests existants | `frontend/src/__tests__/CanvasPerformanceIsolation.test.jsx` | assertions d'isolation des composants non déplacés durant drag/pan | exécuter, compléter par profilage Chrome |
| Échelle par défaut | `frontend/src/utils/viewport.js` | zoom initial 1.0 historiquement | zoom initial 1.2 : +20 % pour TOUTES les cartes/composants, fils, grille et zones de clic sans changer le Document |

## Modifications effectuées
- `Pin.jsx` : suppression du state hover par pin et du title natif retardé; conservation des attributs de câblage et des handlers.
- `Pin.css` : infobulle immédiate CSS, marqueur invisible au repos mais visible en hover/focus.
- `Breadboard.jsx` : hit zones et tooltip SVG réutilisé, sans setState par mouvement.
- `Breadboard.css` : retour visuel localisé, retrait de transition et changement d'ombre de toute la carte au survol.
- `viewport.js` : `DEFAULT_VIEWPORT.zoom = 1.2` (échelle globale unique). La taille des modèles persistés reste inchangée; l'utilisateur peut toujours dézoomer.

## Gates de qualification obligatoires
1. `node --test src/components/parts/arduinoVisualHeaders.test.cjs`
2. `npx vitest run src/canvas/__tests__/CanvasHoverUX.test.jsx src/__tests__/CanvasPerformanceIsolation.test.jsx src/__tests__/ViewportNavigation.integration.test.jsx src/canvas/__tests__/Breadboard.test.jsx`
3. `npm run build`
4. Profilage Chrome Performance : 30 s survol rapide breadboard/Arduino, drag 100 composants, pan, wheel, déplacement de fils; mesurer FPS, frames >16.7ms, long tasks >50ms, mémoire et re-render.
5. Contrôler wiring click/drag, snapping, zoom sous curseur, sauvegarde/réouverture et circuits préexistants; ne pas fusionner PR #21 avant Founder Canvas PASS.

## Limites
Le zoom global de 1.2 agrandit aussi le quadrillage et les fils, par conception : c'est la seule approche qui conserve la cohérence des positions sans réécrire la géométrie. Les tests historiques pouvant supposer zoom=1 doivent être exécutés; aucun résultat PASS n'est présumé. Les gains de fluidité sont des hypothèses techniques à mesurer en navigateur.
