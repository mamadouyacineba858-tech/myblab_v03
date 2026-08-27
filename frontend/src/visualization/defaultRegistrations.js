/**
 * Registrations par défaut des composants de visualisation
 */
import { LedPart } from '../components/parts/LedPart.jsx';
import { ResistorPart } from '../components/parts/ResistorPart.jsx';
import { ArduinoPart } from '../components/parts/ArduinoPart.jsx';
import { ButtonPart } from '../components/parts/ButtonPart.jsx';
import { LatchingButtonPart } from '../components/parts/LatchingButtonPart.jsx';
import { PowerPart } from '../components/parts/PowerPart.jsx';
import { CapacitorPart } from '../components/parts/CapacitorPart.jsx';
import { PolarizedCapacitorPart } from '../components/parts/PolarizedCapacitorPart.jsx';
import { BuzzerPart } from '../components/parts/BuzzerPart.jsx';
import { PotentiometerPart } from '../components/parts/PotentiometerPart.jsx';
import { LdrPart } from '../components/parts/LdrPart.jsx';
import { ThermistorPart } from '../components/parts/ThermistorPart.jsx';
import { DiodePart } from '../components/parts/DiodePart.jsx';
import { RgbLedPart } from '../components/parts/RgbLedPart.jsx';
import { NpnTransistorPart } from '../components/parts/NpnTransistorPart.jsx';
import { ServoPart } from '../components/parts/ServoPart.jsx';
import { DcMotorPart } from '../components/parts/DcMotorPart.jsx';

export const DEFAULT_REGISTRATIONS = [
  { type: 'LED', component: LedPart },
  { type: 'RESISTOR', component: ResistorPart },
  { type: 'ARDUINO', component: ArduinoPart },
  { type: 'BUTTON', component: ButtonPart },
  { type: 'BUTTON_LATCHING', component: LatchingButtonPart },
  { type: 'POWER', component: PowerPart },
  { type: 'CAPACITOR', component: CapacitorPart },
  { type: 'CAPACITOR_POLARIZED', component: PolarizedCapacitorPart },
  { type: 'BUZZER', component: BuzzerPart },
  { type: 'POTENTIOMETER', component: PotentiometerPart },
  { type: 'LDR', component: LdrPart },
  { type: 'THERMISTOR', component: ThermistorPart },
  { type: 'DIODE', component: DiodePart },
  { type: 'RGB_LED', component: RgbLedPart },
  { type: 'NPN_TRANSISTOR', component: NpnTransistorPart },
  { type: 'SERVO', component: ServoPart },
  { type: 'DC_MOTOR', component: DcMotorPart },
];

export function getAvailableTypes() { return DEFAULT_REGISTRATIONS.map(entry => entry.type); }
export function getComponentByType(type) { const entry = DEFAULT_REGISTRATIONS.find(entry => entry.type === type); return entry ? entry.component : null; }
export default DEFAULT_REGISTRATIONS;
