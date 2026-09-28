/**
 * Enregistrements par défaut du Visual State Registry — MB-VIS-COMP-002.
 *
 * Remplace l'ancien branchement de PartRenderer.jsx :
 *   if (type === 'LED') { const { on } = getLedState(...); ... }
 *   else if (type === 'RGB_LED') { const { r, g, b } = getRgbLedState(...); ... }
 *
 * Comportement strictement identique à l'ancien code : mêmes fonctions de
 * lecture (simulator/engine.js), mêmes props produites (isOn / r,g,b).
 *
 * Importé une seule fois pour effet de bord (registerVisualState) par
 * PartRenderer.jsx, sur le modèle déjà utilisé par
 * visualization/defaultRegistrations.js pour le RendererRegistry.
 */
import { getLedState, getRgbLedState } from '../simulator/engine.js'
import { getSegmentedDisplayState } from '../simulator/segmentedDisplay.js'
import { projectSt7066uDisplay } from './st7066uDisplayProjection.js'
import { projectWs2812bV6 } from './ws2812bV6Projection.js'
import { registerVisualState } from './visualStateRegistry.js'

registerVisualState('LED', ({ uid, pinSignals }) => {
  const { on } = getLedState(uid ?? "", pinSignals)
  return { isOn: on }
})

registerVisualState('RGB_LED', ({ uid, pinSignals }) => {
  const { r, g, b } = getRgbLedState(uid ?? "", pinSignals)
  return { r, g, b }
})

// A10-DISP1 : projection segment par segment du contrat segmenté déclaré
// (simulator/segmentedDisplay.js) — aucun chiffre, seulement { a..g, DP }.
registerVisualState('SEVEN_SEGMENT_DISPLAY', ({ uid, pinSignals }) => ({
  segments: getSegmentedDisplayState('SEVEN_SEGMENT_DISPLAY', uid ?? "", pinSignals),
}))

// A10-DISP2 : projection 16x2 de l'état runtime ST7066U (lecture seule) —
// aucune DDRAM ni logique de contrôleur côté Presentation.
registerVisualState('LCD_16X2_WH1602B', ({ runtimeState }) => ({
  lcd: projectSt7066uDisplay(runtimeState),
}))

// A12-NEOPIXEL-FUNC-WS2812B-V6-001 : couleur latchée du pixel (état runtime
// événementiel, lecture seule) — aucun protocole côté Presentation.
registerVisualState('WS2812B_V6', ({ runtimeState }) => projectWs2812bV6(runtimeState))
