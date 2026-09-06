# MB-VIS-WIRE-INTERACTION-007

- Cause : Pin ne gérait que le clic ; aucune session pointer ni preview de création.
- Fichiers : `useCircuitState.js`, `Pin.jsx`, `CircuitComponent.jsx` (relais uid/handler indispensable), `CircuitContext.jsx`, `wires/WiresLayer.jsx`, `wires/WiresLayer.css`, `WireGesture.integration.test.jsx`, ce rapport. WiresLayer réside dans `src/wires`, pas `src/canvas`.
- W1–W3 : session Presentation seule ; preview via clientToCanvas et projection de pin existants, sans mutation components/wires/Document/history.
- W4–W5 : relâchement physique sur B → addWire existant → CommandBus ADD_WIRE ; undo/redo vérifiés.
- W6–W9 : vide/Escape annulent ; même pin et doublon refusés ; pointercancel/blur nettoient aussi. Clic stationnaire conservé ; clic synthétique après drag neutralisé.
- W10–W12 : propagation du pin arrêtée ; vrais gestes pin1/pin2 testés pour BUTTON et BUTTON_LATCHING.
- W13–W15 : preview et endpoint cohérents sous zoom/focus/localScale et après déplacement du composant ; projection/routing existants inchangés.
- Tests ciblés : 93 PASS / 8 fichiers, dont 13 nouveaux tests de geste réel.
- Suite complète : une exécution, 1973 PASS / 19 FAIL (1960 historiques + 13 nouveaux). Les 19 échecs correspondent aux 11 fichiers et décomptes de la baseline documentée dans `docs/pmo/delivery-reports/MB-VIS-BUTTON-INTERACTION-003-delivery-report.md` §7, confirmée par ASSET-006 §Tests ; aucune investigation hors ticket.
- `npx tsc -b`, `npm run build`, `git diff --check` : PASS.
- Browser QA : Chromium local, drag pin1→pin2 des deux types OK, annulation vide OK, recréation sous zoom global + localScale OK. Escape testé dans le navigateur après clic-pin ; pendant le drag, vérifié par intégration (outil navigateur : drag atomique). Preview intermédiaire vérifié par intégration, pas capturé en navigateur.
- Écarts : aucun changement des assets, pins, simulation, CommandBus/handlers, breadboard ou routing. Les deux défauts connus du corps des boutons restent hors périmètre.
