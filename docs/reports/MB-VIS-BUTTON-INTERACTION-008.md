# MB-VIS-BUTTON-INTERACTION-008 — Rapport final

**Cause racine.** `dx` des pins BUTTON/BUTTON_LATCHING a été remesuré sur l'asset Tinkercad (MB-VIS-BUTTON-ASSET-006) mais `dy=30` a été reconduit de l'ancien asset à leads latéraux. Pixel-probe du nouvel asset : boîtier canonique y[9–49], les 4 pattes métalliques sortent en y[0–9] et y[49–60] ; à dy=30 le point de présentation (donc Pin DOM, extrémité de fil et preview, qui partagent tous `getPinPresentationPosition()`) tombe sur le corps, jamais sur une patte.

**Correction.** Ajout de `BUTTON_VISUAL_PINS` / `BUTTON_LATCHING_VISUAL_PINS` dans `pinPresentationGeometry.js` — extension du mécanisme existant (LED/NPN/POWER/ARDUINO). `x` inchangé (14/46, 13/47) ; `y` projeté 30→58 sur la patte inférieure. `componentDefinitions.js` / `canonicalRegistry.js` / breadboard **non modifiés**.

**Tests ciblés.** 197 pass / 198 (seul échec = `pinPresentationGeometry` LED-feet, pré-existant). Assertions dépendantes réalignées sur l'oracle `getPinPresentationPosition()` (ButtonDragInteraction, ButtonPart.raster, LatchingButtonPart.raster) ; +3 tests de projection ajoutés.

**Suite complète.** 1983 pass / 19 fail (baseline historique à l'identique) / 2002. **Build** : `tsc -b` + `vite build` exit 0, 170 modules.

**Browser QA.** BUTTON & BUTTON_LATCHING, pin1/pin2 : extrémité de fil exactement sur la patte métallique (écart endpoint↔pin = 0). Drag composant câblé et zoom global : endpoint cohérent. Console propre, aucun black screen.

**Dette reportée.** La divergence ADR-014 (componentDefinitions = source de présentation) vs projections codées dans `pinPresentationGeometry.js` est enregistrée comme dette préexistante, à traiter transversalement dans **FT-B / MB-VIS-CONTACT-038**. Aucun refactoring entrepris dans 008.
