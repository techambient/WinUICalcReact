import {
  Banknote,
  Binary,
  CalendarDays,
  Calculator,
  ChartSpline,
  CircleGauge,
  Clock,
  Cylinder,
  Database,
  FlaskConical,
  Gauge,
  Plug,
  Ruler,
  Square,
  Thermometer,
  TriangleRight,
  Weight,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ConverterId } from '@/lib/calc/units'

export type ModeId =
  | 'standard'
  | 'scientific'
  | 'graphing'
  | 'programmer'
  | 'date'
  | 'currency'
  | ConverterId
  | 'settings'

export interface ModeDef {
  id: ModeId
  label: string
  icon: LucideIcon
}

export const calculatorModes: ModeDef[] = [
  { id: 'standard', label: 'Standard', icon: Calculator },
  { id: 'scientific', label: 'Scientific', icon: FlaskConical },
  { id: 'graphing', label: 'Graphing', icon: ChartSpline },
  { id: 'programmer', label: 'Programmer', icon: Binary },
  { id: 'date', label: 'Date calculation', icon: CalendarDays },
]

export const converterModes: ModeDef[] = [
  { id: 'currency', label: 'Currency', icon: Banknote },
  { id: 'volume', label: 'Volume', icon: Cylinder },
  { id: 'length', label: 'Length', icon: Ruler },
  { id: 'weight', label: 'Weight and mass', icon: Weight },
  { id: 'temperature', label: 'Temperature', icon: Thermometer },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'area', label: 'Area', icon: Square },
  { id: 'speed', label: 'Speed', icon: Gauge },
  { id: 'time', label: 'Time', icon: Clock },
  { id: 'power', label: 'Power', icon: Plug },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'pressure', label: 'Pressure', icon: CircleGauge },
  { id: 'angle', label: 'Angle', icon: TriangleRight },
]
