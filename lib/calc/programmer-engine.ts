import { groupInteger } from './format'

export type Radix = 16 | 10 | 8 | 2
export type WordSize = 64 | 32 | 16 | 8
export type ShiftMode = 'arithmetic' | 'logical' | 'rotate' | 'carry'

export type ProgBinary = '+' | '-' | '×' | '÷' | '%' | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | '<<' | '>>'
export type ProgUnary = 'NOT' | 'negate' | 'RoL' | 'RoR'

export type ProgAction =
  | { type: 'digit'; digit: string }
  | { type: 'binary'; op: ProgBinary }
  | { type: 'unary'; op: ProgUnary }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'clearEntry' }
  | { type: 'backspace' }
  | { type: 'negate' }
  | { type: 'openParen' }
  | { type: 'closeParen' }
  | { type: 'toggleBit'; bit: number }
  | { type: 'setValue'; value: bigint }
  | { type: 'commit' }
  | { type: 'rewrap' }

export interface ProgContext {
  radix: Radix
  bits: WordSize
  shift: ShiftMode
}

export interface ProgState {
  current: bigint
  entry: string | null
  entryExpr: string | null
  values: bigint[]
  ops: (ProgBinary | '(')[]
  tokens: string[]
  parenStarts: number[]
  lastWasOp: boolean
  justEvaluated: boolean
  lastBinary: { op: ProgBinary; operand: bigint } | null
  lastOpPressed: ProgBinary | null
  error: string | null
  carry: boolean
}

export const initialProgState: ProgState = {
  current: BigInt(0),
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
  carry: false,
}

class ProgError extends Error {}

const ZERO = BigInt(0)
const ONE = BigInt(1)

export const progSymbol: Record<ProgBinary, string> = {
  '+': '+',
  '-': '−',
  '×': '×',
  '÷': '÷',
  '%': '%',
  AND: 'AND',
  OR: 'OR',
  XOR: 'XOR',
  NAND: 'NAND',
  NOR: 'NOR',
  '<<': 'Lsh',
  '>>': 'Rsh',
}

const PRECEDENCE: Record<ProgBinary, number> = {
  '×': 6,
  '÷': 6,
  '%': 6,
  '+': 5,
  '-': 5,
  '<<': 4,
  '>>': 4,
  AND: 3,
  NAND: 3,
  XOR: 2,
  OR: 1,
  NOR: 1,
}

export const wrap = (v: bigint, bits: WordSize) => BigInt.asIntN(bits, v)
const unsigned = (v: bigint, bits: WordSize) => BigInt.asUintN(bits, v)

export function formatRadix(value: bigint, radix: Radix, bits: WordSize, group = true): string {
  if (radix === 10) {
    const s = wrap(value, bits).toString()
    return group ? groupInteger(s) : s
  }
  const s = unsigned(value, bits).toString(radix).toUpperCase()
  if (!group) return s
  return groupInteger(s, ' ', radix === 8 ? 3 : 4)
}

function parseRadix(text: string, radix: Radix): bigint {
  if (radix === 10) return BigInt(text)
  const prefix = radix === 16 ? '0x' : radix === 8 ? '0o' : '0b'
  return BigInt(prefix + text)
}

export const validDigits: Record<Radix, string> = {
  2: '01',
  8: '01234567',
  10: '0123456789',
  16: '0123456789ABCDEF',
}

function applyBinary(op: ProgBinary, a: bigint, b: bigint, ctx: ProgContext): bigint {
  const { bits } = ctx
  switch (op) {
    case '+':
      return wrap(a + b, bits)
    case '-':
      return wrap(a - b, bits)
    case '×':
      return wrap(a * b, bits)
    case '÷':
      if (b === ZERO) throw new ProgError('Cannot divide by zero')
      return wrap(a / b, bits)
    case '%':
      if (b === ZERO) throw new ProgError('Cannot divide by zero')
      return wrap(a % b, bits)
    case 'AND':
      return wrap(a & b, bits)
    case 'OR':
      return wrap(a | b, bits)
    case 'XOR':
      return wrap(a ^ b, bits)
    case 'NAND':
      return wrap(~(a & b), bits)
    case 'NOR':
      return wrap(~(a | b), bits)
    case '<<':
      if (b < ZERO) throw new ProgError('Invalid input')
      if (b >= BigInt(bits)) return ZERO
      return wrap(a << b, bits)
    case '>>':
      if (b < ZERO) throw new ProgError('Invalid input')
      if (ctx.shift === 'logical') {
        if (b >= BigInt(bits)) return ZERO
        return wrap(unsigned(a, bits) >> b, bits)
      }
      return wrap(a >> (b >= BigInt(bits) ? BigInt(bits - 1) : b), bits)
  }
}

function applyUnary(op: ProgUnary, x: bigint, state: ProgState, ctx: ProgContext): { value: bigint; carry: boolean } {
  const { bits } = ctx
  const top = BigInt(bits - 1)
  const u = unsigned(x, bits)
  switch (op) {
    case 'NOT':
      return { value: wrap(~x, bits), carry: state.carry }
    case 'negate':
      return { value: wrap(-x, bits), carry: state.carry }
    case 'RoL': {
      const high = (u >> top) & ONE
      if (ctx.shift === 'carry') {
        const value = wrap((u << ONE) | (state.carry ? ONE : ZERO), bits)
        return { value, carry: high === ONE }
      }
      return { value: wrap((u << ONE) | high, bits), carry: state.carry }
    }
    case 'RoR': {
      const low = u & ONE
      if (ctx.shift === 'carry') {
        const value = wrap((u >> ONE) | ((state.carry ? ONE : ZERO) << top), bits)
        return { value, carry: low === ONE }
      }
      return { value: wrap((u >> ONE) | (low << top), bits), carry: state.carry }
    }
  }
}

export function progCurrent(state: ProgState, ctx: ProgContext): bigint {
  if (state.entry === null) return state.current
  if (state.entry === '' || state.entry === '-') return ZERO
  return wrap(parseRadix(state.entry, ctx.radix), ctx.bits)
}

export function progDisplay(state: ProgState, ctx: ProgContext): string {
  if (state.error) return state.error
  if (state.entry !== null) {
    if (ctx.radix === 10) return groupInteger(state.entry)
    return groupInteger(state.entry.toUpperCase(), ' ', ctx.radix === 8 ? 3 : 4)
  }
  return formatRadix(state.current, ctx.radix, ctx.bits)
}

export function progExpression(state: ProgState): string {
  const parts = [...state.tokens]
  if (state.entryExpr && !state.justEvaluated) parts.push(state.entryExpr)
  return parts.join(' ')
}

function operandText(state: ProgState, ctx: ProgContext) {
  return state.entryExpr ?? formatRadix(progCurrent(state, ctx), ctx.radix, ctx.bits, false)
}

function reduceOnce(values: bigint[], ops: (ProgBinary | '(')[], ctx: ProgContext) {
  const op = ops.pop() as ProgBinary
  const b = values.pop() as bigint
  const a = values.pop() as bigint
  values.push(applyBinary(op, a, b, ctx))
}

export interface ProgStepResult {
  state: ProgState
  history?: { expression: string; result: bigint }
}

export function progStep(prev: ProgState, action: ProgAction, ctx: ProgContext): ProgStepResult {
  try {
    return stepUnsafe(prev, action, ctx)
  } catch (e) {
    if (e instanceof ProgError) {
      return {
        state: { ...prev, error: e.message, entry: null, entryExpr: null, values: [], ops: [], parenStarts: [], lastWasOp: false },
      }
    }
    throw e
  }
}

function stepUnsafe(prev: ProgState, action: ProgAction, ctx: ProgContext): ProgStepResult {
  const { bits, radix } = ctx
  switch (action.type) {
    case 'digit': {
      let s = prev.error ? { ...initialProgState } : prev
      const d = action.digit.toUpperCase()
      if (!validDigits[radix].includes(d)) return { state: s }
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      const base = s.entry === null || s.entry === '0' ? '' : s.entry === '-0' ? '-' : s.entry
      const next = base + d
      const value = parseRadix(next === '-' ? '0' : next, radix)
      if (radix === 10) {
        const max = (ONE << BigInt(bits - 1)) - ONE
        const min = -(ONE << BigInt(bits - 1))
        if (value > max || value < min) return { state: s }
      } else if (value >= ONE << BigInt(bits)) {
        return { state: s }
      }
      return { state: { ...s, entry: next, entryExpr: null, lastWasOp: false } }
    }

    case 'backspace': {
      if (prev.error) return { state: { ...initialProgState } }
      if (prev.justEvaluated) return { state: { ...prev, tokens: [] } }
      if (prev.entry === null) return { state: prev }
      let entry = prev.entry.slice(0, -1)
      if (entry === '' || entry === '-') entry = '0'
      return { state: { ...prev, entry } }
    }

    case 'clear':
      return { state: { ...initialProgState } }

    case 'clearEntry':
      if (prev.error || prev.justEvaluated) return { state: { ...initialProgState } }
      return { state: { ...prev, entry: null, entryExpr: null, current: ZERO } }

    case 'commit':
      if (prev.entry === null) return { state: prev }
      return { state: { ...prev, current: progCurrent(prev, ctx), entry: null } }

    case 'rewrap':
      return {
        state: {
          ...prev,
          current: wrap(progCurrent(prev, ctx), bits),
          entry: null,
          values: prev.values.map((v) => wrap(v, bits)),
        },
      }

    case 'negate': {
      if (prev.error) return { state: prev }
      if (prev.entry !== null && radix === 10) {
        if (prev.entry === '0') return { state: prev }
        const entry = prev.entry.startsWith('-') ? prev.entry.slice(1) : '-' + prev.entry
        const value = BigInt(entry)
        const max = (ONE << BigInt(bits - 1)) - ONE
        if (value > max) return { state: prev }
        return { state: { ...prev, entry } }
      }
      return stepUnsafe(prev, { type: 'unary', op: 'negate' }, ctx)
    }

    case 'unary': {
      if (prev.error) return { state: prev }
      let s = prev
      const x = progCurrent(s, ctx)
      const inner = s.justEvaluated ? formatRadix(x, radix, bits, false) : operandText(s, ctx)
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      const { value, carry } = applyUnary(action.op, x, s, ctx)
      return {
        state: { ...s, current: value, carry, entry: null, entryExpr: `${action.op}(${inner})`, lastWasOp: false },
      }
    }

    case 'toggleBit': {
      if (prev.error) return { state: prev }
      let s = prev
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      const x = progCurrent(s, ctx)
      const value = wrap(x ^ (ONE << BigInt(action.bit)), bits)
      return { state: { ...s, current: value, entry: null, entryExpr: null, lastWasOp: false } }
    }

    case 'setValue': {
      let s = prev.error ? { ...initialProgState } : prev
      if (s.justEvaluated) s = { ...s, tokens: [], justEvaluated: false }
      return { state: { ...s, current: wrap(action.value, bits), entry: null, entryExpr: null, lastWasOp: false } }
    }

    case 'binary': {
      if (prev.error) return { state: prev }
      const values = [...prev.values]
      const ops = [...prev.ops]
      let tokens = [...prev.tokens]
      if (prev.justEvaluated) {
        const v = progCurrent(prev, ctx)
        tokens = [formatRadix(v, radix, bits, false)]
        values.length = 0
        ops.length = 0
        values.push(v)
      } else if (prev.lastWasOp) {
        ops.pop()
        tokens.pop()
      } else {
        values.push(progCurrent(prev, ctx))
        tokens.push(operandText(prev, ctx))
      }
      const p = PRECEDENCE[action.op]
      while (ops.length) {
        const top = ops[ops.length - 1]
        if (top === '(' || PRECEDENCE[top] < p) break
        reduceOnce(values, ops, ctx)
      }
      ops.push(action.op)
      tokens.push(progSymbol[action.op])
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
      if (!s.lastWasOp && (s.entry !== null || s.entryExpr !== null)) {
        s = stepUnsafe(s, { type: 'binary', op: '×' }, ctx).state
      }
      return {
        state: {
          ...s,
          ops: [...s.ops, '('],
          parenStarts: [...s.parenStarts, s.tokens.length],
          tokens: [...s.tokens, '('],
          current: ZERO,
          entry: null,
          entryExpr: null,
          lastWasOp: false,
        },
      }
    }

    case 'closeParen': {
      if (prev.error || prev.parenStarts.length === 0) return { state: prev }
      const values = [...prev.values, progCurrent(prev, ctx)]
      const ops = [...prev.ops]
      const tokens = [...prev.tokens, operandText(prev, ctx)]
      while (ops.length && ops[ops.length - 1] !== '(') reduceOnce(values, ops, ctx)
      ops.pop()
      const parenStarts = [...prev.parenStarts]
      const start = parenStarts.pop() as number
      const group = `(${tokens.slice(start + 1).join(' ')})`
      const result = values.pop() as bigint
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
      if (prev.error) return { state: { ...initialProgState } }
      const x = progCurrent(prev, ctx)
      if (prev.ops.length === 0) {
        if (prev.lastBinary && (prev.justEvaluated || prev.entry !== null || prev.entryExpr !== null)) {
          const { op, operand } = prev.lastBinary
          const result = applyBinary(op, x, operand, ctx)
          const expression = [formatRadix(x, radix, bits, false), progSymbol[op], formatRadix(operand, radix, bits, false), '=']
          return {
            state: { ...prev, tokens: expression, current: result, entry: null, entryExpr: null, justEvaluated: true },
            history: { expression: expression.join(' '), result },
          }
        }
        return {
          state: { ...prev, tokens: [operandText(prev, ctx), '='], current: x, entry: null, entryExpr: null, justEvaluated: true },
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
        reduceOnce(values, ops, ctx)
      }
      tokens.push('=')
      const result = values[0]
      return {
        state: {
          ...initialProgState,
          carry: prev.carry,
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
