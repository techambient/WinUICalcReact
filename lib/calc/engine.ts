import { formatEntry, formatNumber, parseEntry } from './format'

export type BinaryOp = '+' | '-' | '×' | '÷' | 'mod' | '^' | 'yroot' | 'logy'
export type AngleUnit = 'DEG' | 'RAD' | 'GRAD'

export type TrigFn =
  | 'sin' | 'cos' | 'tan' | 'sec' | 'csc' | 'cot'
  | 'asin' | 'acos' | 'atan' | 'asec' | 'acsc' | 'acot'
  | 'sinh' | 'cosh' | 'tanh' | 'sech' | 'csch' | 'coth'
  | 'asinh' | 'acosh' | 'atanh' | 'asech' | 'acsch' | 'acoth'

export type UnaryOp =
  | 'sqr' | 'cube' | 'sqrt' | 'cbrt' | 'recip' | 'abs' | 'fact'
  | 'pow10' | 'pow2' | 'powE' | 'log' | 'ln' | 'negate'
  | 'floor' | 'ceil' | 'dms' | 'deg'
  | `trig:${TrigFn}`

export type Action =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'binary'; op: BinaryOp }
  | { type: 'unary'; op: UnaryOp }
  | { type: 'percent' }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'clearEntry' }
  | { type: 'backspace' }
  | { type: 'negate' }
  | { type: 'openParen' }
  | { type: 'closeParen' }
  | { type: 'exp' }
  | { type: 'setValue'; value: number }

export interface EngineContext {
  precedence: boolean
  angle: AngleUnit
  fe: boolean
}

export interface EngineState {
  current: number
  entry: string | null
  entryExpr: string | null
  values: number[]
  ops: (BinaryOp | '(')[]
  tokens: string[]
  parenStarts: number[]
  lastWasOp: boolean
  justEvaluated: boolean
  lastBinary: { op: BinaryOp; operand: number } | null
  lastOpPressed: BinaryOp | null
  error: string | null
}

export interface StepResult {
  state: EngineState
  history?: { expression: string; result: number }
}

export const initialEngineState: EngineState = {
  current: 0,
  entry: null,
  entryExpr: null,
  values: [],
  ops: [],
  tokens: [],
  parenStarts: [],
  lastWasOp: false,
  justEvaluated: false,
  lastBinary: null,
  lastOpPressed: null,
  error: null,
}

class CalcError extends Error {}

const MAX_DIGITS = 16

export const binarySymbol: Record<BinaryOp, string> = {
  '+': '+',
  '-': '−',
  '×': '×',
  '÷': '÷',
  mod: 'Mod',
  '^': '^',
  yroot: 'yroot',
  logy: 'log base',
}

function precedenceOf(op: BinaryOp, ctx: EngineContext): number {
  if (!ctx.precedence) return 1
  if (op === '+' || op === '-') return 1
  if (op === '×' || op === '÷' || op === 'mod') return 2
  return 3
}

function checkFinite(n: number): number {
  if (Number.isNaN(n)) throw new CalcError('Invalid input')
  if (!Number.isFinite(n)) throw new CalcError('Overflow')
  return n
}

export function applyBinary(op: BinaryOp, a: number, b: number): number {
  switch (op) {
    case '+':
      return checkFinite(a + b)
    case '-':
      return checkFinite(a - b)
    case '×':
      return checkFinite(a * b)
    case '÷':
      if (b === 0) throw new CalcError(a === 0 ? 'Result is undefined' : 'Cannot divide by zero')
      return checkFinite(a / b)
    case 'mod':
      if (b === 0) throw new CalcError('Cannot divide by zero')
      return checkFinite(a % b)
    case '^':
      return checkFinite(Math.pow(a, b))
    case 'yroot': {
      if (b === 0) throw new CalcError('Invalid input')
      if (a < 0) {
        if (Number.isInteger(b) && Math.abs(b) % 2 === 1) return checkFinite(-Math.pow(-a, 1 / b))
        throw new CalcError('Invalid input')
      }
      return checkFinite(Math.pow(a, 1 / b))
    }
    case 'logy':
      if (a <= 0 || b <= 0 || b === 1) throw new CalcError('Invalid input')
      return checkFinite(Math.log(a) / Math.log(b))
  }
}

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
]

function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  z -= 1
  let x = LANCZOS[0]
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (z + i)
  const t = z + 7.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
}

function factorial(n: number): number {
  if (Number.isInteger(n)) {
    if (n < 0) throw new CalcError('Invalid input')
    if (n > 170) throw new CalcError('Overflow')
    let r = 1
    for (let i = 2; i <= n; i++) r *= i
    return r
  }
  if (n < 0 && Number.isInteger(n)) throw new CalcError('Invalid input')
  return checkFinite(gamma(n + 1))
}

function toRadians(x: number, angle: AngleUnit) {
  if (angle === 'DEG') return (x * Math.PI) / 180
  if (angle === 'GRAD') return (x * Math.PI) / 200
  return x
}

function fromRadians(x: number, angle: AngleUnit) {
  if (angle === 'DEG') return (x * 180) / Math.PI
  if (angle === 'GRAD') return (x * 200) / Math.PI
  return x
}

function clean(n: number) {
  const r = Number(n.toPrecision(15))
  return Math.abs(r) < 1e-15 ? 0 : r
}

function reciprocal(n: number) {
  if (n === 0) throw new CalcError('Invalid input')
  return 1 / n
}

function trig(fn: TrigFn, x: number, angle: AngleUnit): number {
  const quarter = angle === 'DEG' ? 90 : angle === 'GRAD' ? 100 : null
  const isQuarterOdd = quarter !== null && Math.abs(x % (2 * quarter)) === quarter
  const isHalfMultiple = quarter !== null && x % (2 * quarter) === 0
  const r = toRadians(x, angle)
  const inv = (v: number) => {
    if (Number.isNaN(v)) throw new CalcError('Invalid input')
    return clean(fromRadians(v, angle))
  }
  switch (fn) {
    case 'sin':
      return isHalfMultiple ? 0 : clean(Math.sin(r))
    case 'cos':
      return isQuarterOdd ? 0 : clean(Math.cos(r))
    case 'tan':
      if (isQuarterOdd) throw new CalcError('Invalid input')
      return isHalfMultiple ? 0 : clean(Math.tan(r))
    case 'sec':
      if (isQuarterOdd) throw new CalcError('Invalid input')
      return clean(1 / Math.cos(r))
    case 'csc':
      if (isHalfMultiple || x === 0) throw new CalcError('Invalid input')
      return clean(1 / Math.sin(r))
    case 'cot':
      if (isHalfMultiple || x === 0) throw new CalcError('Invalid input')
      return isQuarterOdd ? 0 : clean(1 / Math.tan(r))
    case 'asin':
      if (x < -1 || x > 1) throw new CalcError('Invalid input')
      return inv(Math.asin(x))
    case 'acos':
      if (x < -1 || x > 1) throw new CalcError('Invalid input')
      return inv(Math.acos(x))
    case 'atan':
      return inv(Math.atan(x))
    case 'asec':
      if (Math.abs(x) < 1) throw new CalcError('Invalid input')
      return inv(Math.acos(1 / x))
    case 'acsc':
      if (Math.abs(x) < 1) throw new CalcError('Invalid input')
      return inv(Math.asin(1 / x))
    case 'acot':
      return inv(x === 0 ? Math.PI / 2 : Math.atan(1 / x))
    case 'sinh':
      return checkFinite(clean(Math.sinh(x)))
    case 'cosh':
      return checkFinite(clean(Math.cosh(x)))
    case 'tanh':
      return clean(Math.tanh(x))
    case 'sech':
      return clean(1 / Math.cosh(x))
    case 'csch':
      return clean(reciprocal(Math.sinh(x)))
    case 'coth':
      return clean(reciprocal(Math.tanh(x)))
    case 'asinh':
      return clean(Math.asinh(x))
    case 'acosh':
      if (x < 1) throw new CalcError('Invalid input')
      return clean(Math.acosh(x))
    case 'atanh':
      if (Math.abs(x) >= 1) throw new CalcError('Invalid input')
      return clean(Math.atanh(x))
    case 'asech':
      if (x <= 0 || x > 1) throw new CalcError('Invalid input')
      return clean(Math.acosh(1 / x))
    case 'acsch':
      return clean(Math.asinh(reciprocal(x)))
    case 'acoth':
      if (Math.abs(x) <= 1) throw new CalcError('Invalid input')
      return clean(Math.atanh(1 / x))
  }
}

function toDms(x: number) {
  const sign = Math.sign(x)
  const a = Math.abs(x)
  const d = Math.trunc(a)
  const minutesFull = (a - d) * 60
  const m = Math.trunc(minutesFull)
  const s = (minutesFull - m) * 60
  return sign * clean(d + m / 100 + s / 10000)
}

function fromDms(x: number) {
  const sign = Math.sign(x)
  const a = Math.abs(x)
  const d = Math.trunc(a)
  const mmFull = (a - d) * 100
  const mm = Math.trunc(Number(mmFull.toFixed(10)))
  const ss = (mmFull - mm) * 100
  return sign * clean(d + mm / 60 + ss / 3600)
}

const angleSub: Record<AngleUnit, string> = { DEG: '₀', RAD: 'ᵣ', GRAD: 'g' }

export function applyUnary(op: UnaryOp, x: number, angle: AngleUnit): number {
  if (op.startsWith('trig:')) return trig(op.slice(5) as TrigFn, x, angle)
  switch (op) {
    case 'sqr':
      return checkFinite(x * x)
    case 'cube':
      return checkFinite(x * x * x)
    case 'sqrt':
      if (x < 0) throw new CalcError('Invalid input')
      return Math.sqrt(x)
    case 'cbrt':
      return Math.cbrt(x)
    case 'recip':
      if (x === 0) throw new CalcError('Cannot divide by zero')
      return 1 / x
    case 'abs':
      return Math.abs(x)
    case 'fact':
      return factorial(x)
    case 'pow10':
      return checkFinite(Math.pow(10, x))
    case 'pow2':
      return checkFinite(Math.pow(2, x))
    case 'powE':
      return checkFinite(Math.exp(x))
    case 'log':
      if (x <= 0) throw new CalcError('Invalid input')
      return clean(Math.log10(x))
    case 'ln':
      if (x <= 0) throw new CalcError('Invalid input')
      return Math.log(x)
    case 'negate':
      return -x
    case 'floor':
      return Math.floor(x)
    case 'ceil':
      return Math.ceil(x)
    case 'dms':
      return toDms(x)
    case 'deg':
      return fromDms(x)
  }
  return x
}

function unaryLabel(op: UnaryOp, inner: string, angle: AngleUnit): string {
  if (op.startsWith('trig:')) {
    const fn = op.slice(5) as TrigFn
    const isHyperbolic = fn.endsWith('h')
    const display = fn.startsWith('a') ? `${fn.slice(1)}⁻¹` : fn
    return `${display}${isHyperbolic ? '' : angleSub[angle]}(${inner})`
  }
  const labels: Record<string, (s: string) => string> = {
    sqr: (s) => `sqr(${s})`,
    cube: (s) => `cube(${s})`,
    sqrt: (s) => `√(${s})`,
    cbrt: (s) => `cuberoot(${s})`,
    recip: (s) => `1/(${s})`,
    abs: (s) => `abs(${s})`,
    fact: (s) => `fact(${s})`,
    pow10: (s) => `10^(${s})`,
    pow2: (s) => `2^(${s})`,
    powE: (s) => `e^(${s})`,
    log: (s) => `log(${s})`,
    ln: (s) => `ln(${s})`,
    negate: (s) => `negate(${s})`,
    floor: (s) => `floor(${s})`,
    ceil: (s) => `ceil(${s})`,
    dms: (s) => `dms(${s})`,
    deg: (s) => `degrees(${s})`,
  }
  return labels[op](inner)
}

export function currentValue(state: EngineState): number {
  return state.entry !== null ? parseEntry(state.entry) : state.current
}

export function displayText(state: EngineState, ctx: EngineContext): string {
  if (state.error) return state.error
  if (state.entry !== null) return formatEntry(state.entry)
  return formatNumber(state.current, ctx.fe)
}

export function expressionText(state: EngineState): string {
  const parts = [...state.tokens]
  if (state.entryExpr && !state.justEvaluated) parts.push(state.entryExpr)
  return parts.join(' ')
}

function operandText(state: EngineState, ctx: EngineContext) {
  return state.entryExpr ?? formatNumber(currentValue(state), ctx.fe)
}

function reduceOnce(values: number[], ops: (BinaryOp | '(')[]) {
  const op = ops.pop() as BinaryOp
  const b = values.pop() as number
  const a = values.pop() as number
  values.push(applyBinary(op, a, b))
}

function freshAfterError(state: EngineState): EngineState {
  return state.error ? { ...initialEngineState } : state
}

export function step(prev: EngineState, action: Action, ctx: EngineContext): StepResult {
  try {
    return { ...stepUnsafe(prev, action, ctx) }
  } catch (e) {
    if (e instanceof CalcError) {
      return {
        state: {
          ...prev,
          error: e.message,
          entry: null,
          entryExpr: null,
          values: [],
          ops: [],
          parenStarts: [],
          lastWasOp: false,
        },
      }
    }
    throw e
  }
}

function stepUnsafe(prev: EngineState, action: Action, ctx: EngineContext): StepResult {
  switch (action.type) {
    case 'digit': {
      let s = freshAfterError(prev)
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      if (s.entry === null) {
        return { state: { ...s, entry: action.digit, entryExpr: null, lastWasOp: false } }
      }
      const entry = s.entry
      if (entry.includes('e')) {
        const [mant, exp] = entry.split('e')
        const sign = exp[0]
        let digits = exp.slice(1)
        if (digits === '0') digits = ''
        if (digits.length >= 4) return { state: s }
        return { state: { ...s, entry: `${mant}e${sign}${digits}${action.digit}` } }
      }
      const digitCount = entry.replace(/[-.]/g, '').length
      if (digitCount >= MAX_DIGITS) return { state: s }
      if (entry === '0') return { state: { ...s, entry: action.digit } }
      if (entry === '-0') return { state: { ...s, entry: '-' + action.digit } }
      return { state: { ...s, entry: entry + action.digit } }
    }

    case 'decimal': {
      let s = freshAfterError(prev)
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      if (s.entry === null) return { state: { ...s, entry: '0.', entryExpr: null, lastWasOp: false } }
      if (s.entry.includes('.') || s.entry.includes('e')) return { state: s }
      return { state: { ...s, entry: s.entry + '.' } }
    }

    case 'exp': {
      if (prev.error) return { state: prev }
      let s = prev
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      let entry = s.entry ?? formatNumber(s.current, false, false)
      if (entry.includes('e')) return { state: s }
      if (!entry.includes('.')) entry += '.'
      return { state: { ...s, entry: entry + 'e+0', entryExpr: null, lastWasOp: false } }
    }

    case 'backspace': {
      if (prev.error) return { state: { ...initialEngineState } }
      if (prev.justEvaluated) return { state: { ...prev, tokens: [] } }
      if (prev.entry === null) return { state: prev }
      let entry = prev.entry
      if (entry.includes('e')) {
        const [mant, exp] = entry.split('e')
        const sign = exp[0]
        const digits = exp.slice(1)
        if (digits.length > 1) entry = `${mant}e${sign}${digits.slice(0, -1)}`
        else if (digits !== '0') entry = `${mant}e${sign}0`
        else entry = mant
        return { state: { ...prev, entry } }
      }
      entry = entry.slice(0, -1)
      if (entry === '' || entry === '-') entry = '0'
      return { state: { ...prev, entry } }
    }

    case 'clear':
      return { state: { ...initialEngineState } }

    case 'clearEntry': {
      if (prev.error) return { state: { ...initialEngineState } }
      if (prev.justEvaluated) return { state: { ...initialEngineState } }
      return { state: { ...prev, entry: null, entryExpr: null, current: 0 } }
    }

    case 'negate': {
      if (prev.error) return { state: prev }
      if (prev.entry !== null) {
        const entry = prev.entry
        if (entry.includes('e')) {
          const [mant, exp] = entry.split('e')
          const sign = exp[0] === '+' ? '-' : '+'
          return { state: { ...prev, entry: `${mant}e${sign}${exp.slice(1)}` } }
        }
        if (entry === '0') return { state: prev }
        return { state: { ...prev, entry: entry.startsWith('-') ? entry.slice(1) : '-' + entry } }
      }
      return stepUnsafe(prev, { type: 'unary', op: 'negate' }, ctx)
    }

    case 'unary': {
      if (prev.error) return { state: prev }
      let s = prev
      const x = currentValue(s)
      const inner = s.justEvaluated ? formatNumber(x, ctx.fe) : operandText(s, ctx)
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      const result = applyUnary(action.op, x, ctx.angle)
      return {
        state: {
          ...s,
          current: result,
          entry: null,
          entryExpr: unaryLabel(action.op, inner, ctx.angle),
          lastWasOp: false,
        },
      }
    }

    case 'percent': {
      if (prev.error) return { state: prev }
      const x = currentValue(prev)
      const top = prev.ops[prev.ops.length - 1]
      const base = prev.values[prev.values.length - 1]
      let result = 0
      if (top && top !== '(' && base !== undefined) {
        result = top === '+' || top === '-' ? (base * x) / 100 : x / 100
      }
      const s = prev.justEvaluated ? { ...prev, tokens: [], justEvaluated: false } : prev
      return {
        state: {
          ...s,
          current: result,
          entry: null,
          entryExpr: formatNumber(result, ctx.fe),
          lastWasOp: false,
        },
      }
    }

    case 'setValue': {
      let s = freshAfterError(prev)
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      return { state: { ...s, current: action.value, entry: null, entryExpr: null, lastWasOp: false } }
    }

    case 'binary': {
      if (prev.error) return { state: prev }
      const values = [...prev.values]
      const ops = [...prev.ops]
      let tokens = [...prev.tokens]

      if (prev.justEvaluated) {
        const v = currentValue(prev)
        tokens = [formatNumber(v, ctx.fe)]
        values.length = 0
        ops.length = 0
        values.push(v)
      } else if (prev.lastWasOp) {
        ops.pop()
        tokens.pop()
      } else {
        values.push(currentValue(prev))
        tokens.push(operandText(prev, ctx))
      }

      const p = precedenceOf(action.op, ctx)
      while (ops.length) {
        const top = ops[ops.length - 1]
        if (top === '(') break
        if (precedenceOf(top, ctx) >= p) reduceOnce(values, ops)
        else break
      }
      ops.push(action.op)
      tokens.push(binarySymbol[action.op])

      return {
        state: {
          ...prev,
          values,
          ops,
          tokens,
          current: values[values.length - 1],
          entry: null,
          entryExpr: null,
          lastWasOp: true,
          justEvaluated: false,
          lastOpPressed: action.op,
        },
      }
    }

    case 'openParen': {
      if (prev.error) return { state: prev }
      let s = prev
      if (s.justEvaluated) s = { ...s, tokens: [], values: [], ops: [], justEvaluated: false }
      const hasOperand = !s.lastWasOp && (s.entry !== null || s.entryExpr !== null)
      if (hasOperand) {
        s = stepUnsafe(s, { type: 'binary', op: '×' }, ctx).state
      }
      return {
        state: {
          ...s,
          ops: [...s.ops, '('],
          parenStarts: [...s.parenStarts, s.tokens.length],
          tokens: [...s.tokens, '('],
          current: 0,
          entry: null,
          entryExpr: null,
          lastWasOp: false,
        },
      }
    }

    case 'closeParen': {
      if (prev.error || prev.parenStarts.length === 0) return { state: prev }
      const values = [...prev.values, currentValue(prev)]
      const ops = [...prev.ops]
      const tokens = [...prev.tokens, operandText(prev, ctx)]
      while (ops.length && ops[ops.length - 1] !== '(') reduceOnce(values, ops)
      ops.pop()
      const parenStarts = [...prev.parenStarts]
      const start = parenStarts.pop() as number
      const group = `(${tokens.slice(start + 1).join(' ')})`
      const result = values.pop() as number
      return {
        state: {
          ...prev,
          values,
          ops,
          tokens: tokens.slice(0, start),
          parenStarts,
          current: result,
          entry: null,
          entryExpr: group,
          lastWasOp: false,
        },
      }
    }

    case 'equals': {
      if (prev.error) return { state: { ...initialEngineState } }
      const x = currentValue(prev)

      if (prev.ops.length === 0) {
        if (prev.lastBinary && (prev.justEvaluated || prev.entry !== null || prev.entryExpr !== null)) {
          const { op, operand } = prev.lastBinary
          const result = applyBinary(op, x, operand)
          const expression = [formatNumber(x, ctx.fe), binarySymbol[op], formatNumber(operand, ctx.fe), '=']
          return {
            state: { ...prev, tokens: expression, current: result, entry: null, entryExpr: null, justEvaluated: true },
            history: { expression: expression.join(' '), result },
          }
        }
        const expression = [operandText(prev, ctx), '=']
        return {
          state: { ...prev, tokens: expression, current: x, entry: null, entryExpr: null, justEvaluated: true },
        }
      }

      const values = [...prev.values, x]
      const ops = [...prev.ops]
      const tokens = [...prev.tokens, operandText(prev, ctx)]
      for (let i = 0; i < prev.parenStarts.length; i++) tokens.push(')')
      while (ops.length) {
        if (ops[ops.length - 1] === '(') {
          ops.pop()
          continue
        }
        reduceOnce(values, ops)
      }
      const result = values[0]
      tokens.push('=')
      return {
        state: {
          ...initialEngineState,
          tokens,
          current: result,
          justEvaluated: true,
          lastBinary: prev.lastOpPressed ? { op: prev.lastOpPressed, operand: x } : null,
        },
        history: { expression: tokens.join(' '), result },
      }
    }
  }
}
