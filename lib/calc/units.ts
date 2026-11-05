export interface UnitDef {
  id: string
  name: string
  abbr: string
  /** Multiply by factor to convert to base; or provide custom converters. */
  factor?: number
  toBase?: (v: number) => number
  fromBase?: (v: number) => number
}

export interface UnitCategory {
  id: ConverterId
  name: string
  allowNegative: boolean
  units: UnitDef[]
  defaultFrom: string
  defaultTo: string
}

export type ConverterId =
  | 'volume' | 'length' | 'weight' | 'temperature' | 'energy' | 'area'
  | 'speed' | 'time' | 'power' | 'data' | 'pressure' | 'angle'

const u = (id: string, name: string, abbr: string, factor: number): UnitDef => ({ id, name, abbr, factor })

export const categories: Record<ConverterId, UnitCategory> = {
  volume: {
    id: 'volume',
    name: 'Volume',
    allowNegative: false,
    defaultFrom: 'ml',
    defaultTo: 'cup-us',
    units: [
      u('ml', 'Milliliters', 'mL', 1),
      u('cc', 'Cubic centimeters', 'cm³', 1),
      u('l', 'Liters', 'L', 1000),
      u('m3', 'Cubic meters', 'm³', 1e6),
      u('tsp-us', 'Teaspoons (US)', 'tsp', 4.92892159375),
      u('tbsp-us', 'Tablespoons (US)', 'tbsp', 14.78676478125),
      u('floz-us', 'Fluid ounces (US)', 'fl oz', 29.5735295625),
      u('cup-us', 'Cups (US)', 'cup', 236.5882365),
      u('pt-us', 'Pints (US)', 'pt', 473.176473),
      u('qt-us', 'Quarts (US)', 'qt', 946.352946),
      u('gal-us', 'Gallons (US)', 'gal', 3785.411784),
      u('in3', 'Cubic inches', 'in³', 16.387064),
      u('ft3', 'Cubic feet', 'ft³', 28316.846592),
      u('yd3', 'Cubic yards', 'yd³', 764554.857984),
      u('tsp-uk', 'Teaspoons (UK)', 'tsp', 5.91938802083),
      u('tbsp-uk', 'Tablespoons (UK)', 'tbsp', 17.7581640625),
      u('floz-uk', 'Fluid ounces (UK)', 'fl oz', 28.4130625),
      u('pt-uk', 'Pints (UK)', 'pt', 568.26125),
      u('qt-uk', 'Quarts (UK)', 'qt', 1136.5225),
      u('gal-uk', 'Gallons (UK)', 'gal', 4546.09),
    ],
  },
  length: {
    id: 'length',
    name: 'Length',
    allowNegative: false,
    defaultFrom: 'cm',
    defaultTo: 'in',
    units: [
      u('nm', 'Nanometers', 'nm', 1e-9),
      u('um', 'Microns', 'µm', 1e-6),
      u('mm', 'Millimeters', 'mm', 1e-3),
      u('cm', 'Centimeters', 'cm', 1e-2),
      u('m', 'Meters', 'm', 1),
      u('km', 'Kilometers', 'km', 1e3),
      u('in', 'Inches', 'in', 0.0254),
      u('ft', 'Feet', 'ft', 0.3048),
      u('yd', 'Yards', 'yd', 0.9144),
      u('mi', 'Miles', 'mi', 1609.344),
      u('nmi', 'Nautical miles', 'NMI', 1852),
    ],
  },
  weight: {
    id: 'weight',
    name: 'Weight and mass',
    allowNegative: false,
    defaultFrom: 'kg',
    defaultTo: 'lb',
    units: [
      u('ct', 'Carats', 'ct', 0.0002),
      u('mg', 'Milligrams', 'mg', 1e-6),
      u('cg', 'Centigrams', 'cg', 1e-5),
      u('dg', 'Decigrams', 'dg', 1e-4),
      u('g', 'Grams', 'g', 1e-3),
      u('dag', 'Dekagrams', 'dag', 1e-2),
      u('hg', 'Hectograms', 'hg', 0.1),
      u('kg', 'Kilograms', 'kg', 1),
      u('t', 'Metric tonnes', 't', 1000),
      u('oz', 'Ounces', 'oz', 0.028349523125),
      u('lb', 'Pounds', 'lb', 0.45359237),
      u('st', 'Stone', 'st', 6.35029318),
      u('ston', 'Short tons (US)', 'ton', 907.18474),
      u('lton', 'Long tons (UK)', 'ton', 1016.0469088),
    ],
  },
  temperature: {
    id: 'temperature',
    name: 'Temperature',
    allowNegative: true,
    defaultFrom: 'c',
    defaultTo: 'f',
    units: [
      { id: 'c', name: 'Celsius', abbr: '°C', toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', name: 'Fahrenheit', abbr: '°F', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'k', name: 'Kelvin', abbr: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  energy: {
    id: 'energy',
    name: 'Energy',
    allowNegative: false,
    defaultFrom: 'kcal',
    defaultTo: 'kj',
    units: [
      u('ev', 'Electron volts', 'eV', 1.602176565e-19),
      u('j', 'Joules', 'J', 1),
      u('kj', 'Kilojoules', 'kJ', 1000),
      u('cal', 'Thermal calories', 'cal', 4.184),
      u('kcal', 'Food calories', 'kcal', 4184),
      u('ftlb', 'Foot-pounds', 'ft•lb', 1.3558179483314),
      u('btu', 'British thermal units', 'BTU', 1055.056),
      u('kwh', 'Kilowatt-hours', 'kWh', 3.6e6),
    ],
  },
  area: {
    id: 'area',
    name: 'Area',
    allowNegative: false,
    defaultFrom: 'm2',
    defaultTo: 'ft2',
    units: [
      u('mm2', 'Square millimeters', 'mm²', 1e-6),
      u('cm2', 'Square centimeters', 'cm²', 1e-4),
      u('m2', 'Square meters', 'm²', 1),
      u('ha', 'Hectares', 'ha', 1e4),
      u('km2', 'Square kilometers', 'km²', 1e6),
      u('in2', 'Square inches', 'in²', 0.00064516),
      u('ft2', 'Square feet', 'ft²', 0.09290304),
      u('yd2', 'Square yards', 'yd²', 0.83612736),
      u('ac', 'Acres', 'ac', 4046.8564224),
      u('mi2', 'Square miles', 'mi²', 2589988.110336),
    ],
  },
  speed: {
    id: 'speed',
    name: 'Speed',
    allowNegative: false,
    defaultFrom: 'kmh',
    defaultTo: 'mph',
    units: [
      u('cms', 'Centimeters per second', 'cm/s', 0.01),
      u('ms', 'Meters per second', 'm/s', 1),
      u('kmh', 'Kilometers per hour', 'km/h', 1 / 3.6),
      u('fts', 'Feet per second', 'ft/s', 0.3048),
      u('mph', 'Miles per hour', 'mph', 0.44704),
      u('kn', 'Knots', 'kn', 1852 / 3600),
      u('mach', 'Mach', 'M', 340.3),
    ],
  },
  time: {
    id: 'time',
    name: 'Time',
    allowNegative: false,
    defaultFrom: 'h',
    defaultTo: 'min',
    units: [
      u('us', 'Microseconds', 'µs', 1e-6),
      u('msec', 'Milliseconds', 'ms', 1e-3),
      u('s', 'Seconds', 's', 1),
      u('min', 'Minutes', 'min', 60),
      u('h', 'Hours', 'h', 3600),
      u('d', 'Days', 'd', 86400),
      u('wk', 'Weeks', 'wk', 604800),
      u('yr', 'Years', 'yr', 31536000),
    ],
  },
  power: {
    id: 'power',
    name: 'Power',
    allowNegative: false,
    defaultFrom: 'kw',
    defaultTo: 'hp',
    units: [
      u('w', 'Watts', 'W', 1),
      u('kw', 'Kilowatts', 'kW', 1000),
      u('hp', 'Horsepower (US)', 'hp', 745.69987158227),
      u('ftlbmin', 'Foot-pounds/minute', 'ft•lb/min', 0.0225969658055),
      u('btumin', 'BTUs/minute', 'BTU/min', 17.58426666667),
    ],
  },
  data: {
    id: 'data',
    name: 'Data',
    allowNegative: false,
    defaultFrom: 'gb',
    defaultTo: 'mb',
    units: [
      u('bit', 'Bits', 'b', 1),
      u('nibble', 'Nibble', 'nybl', 4),
      u('byte', 'Bytes', 'B', 8),
      u('kbit', 'Kilobits', 'Kb', 1e3),
      u('kibit', 'Kibibits', 'Ki', 1024),
      u('kb', 'Kilobytes', 'KB', 8e3),
      u('kib', 'Kibibytes', 'KiB', 8 * 1024),
      u('mbit', 'Megabits', 'Mb', 1e6),
      u('mibit', 'Mebibits', 'Mi', 2 ** 20),
      u('mb', 'Megabytes', 'MB', 8e6),
      u('mib', 'Mebibytes', 'MiB', 8 * 2 ** 20),
      u('gbit', 'Gigabits', 'Gb', 1e9),
      u('gibit', 'Gibibits', 'Gi', 2 ** 30),
      u('gb', 'Gigabytes', 'GB', 8e9),
      u('gib', 'Gibibytes', 'GiB', 8 * 2 ** 30),
      u('tbit', 'Terabits', 'Tb', 1e12),
      u('tibit', 'Tebibits', 'Ti', 2 ** 40),
      u('tb', 'Terabytes', 'TB', 8e12),
      u('tib', 'Tebibytes', 'TiB', 8 * 2 ** 40),
      u('pbit', 'Petabits', 'Pb', 1e15),
      u('pibit', 'Pebibits', 'Pi', 2 ** 50),
      u('pb', 'Petabytes', 'PB', 8e15),
      u('pib', 'Pebibytes', 'PiB', 8 * 2 ** 50),
    ],
  },
  pressure: {
    id: 'pressure',
    name: 'Pressure',
    allowNegative: false,
    defaultFrom: 'atm',
    defaultTo: 'bar',
    units: [
      u('atm', 'Atmospheres', 'atm', 101325),
      u('bar', 'Bars', 'ba', 100000),
      u('kpa', 'Kilopascals', 'kPa', 1000),
      u('mmhg', 'Millimeters of mercury', 'mmHg', 133.322387415),
      u('pa', 'Pascals', 'Pa', 1),
      u('psi', 'Pounds per square inch', 'psi', 6894.757293168),
    ],
  },
  angle: {
    id: 'angle',
    name: 'Angle',
    allowNegative: true,
    defaultFrom: 'deg',
    defaultTo: 'rad',
    units: [
      u('deg', 'Degrees', 'deg', 1),
      u('rad', 'Radians', 'rad', 180 / Math.PI),
      u('grad', 'Gradians', 'grad', 0.9),
    ],
  },
}

export function convert(value: number, from: UnitDef, to: UnitDef): number {
  const base = from.toBase ? from.toBase(value) : value * (from.factor ?? 1)
  return to.fromBase ? to.fromBase(base) : base / (to.factor ?? 1)
}
