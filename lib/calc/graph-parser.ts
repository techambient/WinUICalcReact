type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }

type Node =
  | { k: 'num'; v: number }
  | { k: 'x' }
  | { k: 'neg'; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'fn'; name: string; a: Node }

const FUNCTIONS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sec: (x) => 1 / Math.cos(x),
  csc: (x) => 1 / Math.sin(x),
  cot: (x) => 1 / Math.tan(x),
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, 'π': Math.PI, e: Math.E }

function tokenize(src: string): Token[] {
  const s = src
    .replace(/\s+/g, '')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√/g, 'sqrt')
  const tokens: Token[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      const v = Number(s.slice(i, j))
      if (Number.isNaN(v)) throw new Error('Invalid number')
      tokens.push({ t: 'num', v })
      i = j
    } else if (/[a-zπ]/i.test(c)) {
      let j = i
      while (j < s.length && /[a-zπ]/i.test(s[j])) j++
      const word = s.slice(i, j).toLowerCase()
      splitIdentifier(word).forEach((v) => tokens.push({ t: 'id', v }))
      i = j
    } else if ('+-*/^'.includes(c)) {
      tokens.push({ t: 'op', v: c })
      i++
    } else if (c === '(' || c === '[') {
      tokens.push({ t: 'lp' })
      i++
    } else if (c === ')' || c === ']') {
      tokens.push({ t: 'rp' })
      i++
    } else {
      throw new Error(`Unexpected "${c}"`)
    }
  }
  return insertImplicitMultiplication(tokens)
}

function splitIdentifier(word: string): string[] {
  const out: string[] = []
  let rest = word
  const names = [...Object.keys(FUNCTIONS), 'pi'].sort((a, b) => b.length - a.length)
  while (rest.length) {
    const match = names.find((n) => rest.startsWith(n))
    if (match) {
      out.push(match)
      rest = rest.slice(match.length)
    } else if (rest[0] === 'x' || rest[0] === 'e' || rest[0] === 'π') {
      out.push(rest[0])
      rest = rest.slice(1)
    } else {
      throw new Error(`Unknown name "${rest}"`)
    }
  }
  return out
}

function insertImplicitMultiplication(tokens: Token[]): Token[] {
  const out: Token[] = []
  for (let i = 0; i < tokens.length; i++) {
    const prev = out[out.length - 1]
    const cur = tokens[i]
    const prevEndsValue =
      prev && (prev.t === 'num' || prev.t === 'rp' || (prev.t === 'id' && !(prev.v in FUNCTIONS)))
    const curStartsValue = cur.t === 'num' || cur.t === 'lp' || cur.t === 'id'
    if (prevEndsValue && curStartsValue) out.push({ t: 'op', v: '*' })
    out.push(cur)
  }
  return out
}

function parse(tokens: Token[]): Node {
  let pos = 0
  const peek = () => tokens[pos]

  function expr(): Node {
    let left = term()
    while (peek()?.t === 'op' && ((peek() as { v: string }).v === '+' || (peek() as { v: string }).v === '-')) {
      const op = (tokens[pos++] as { v: string }).v
      left = { k: 'bin', op, a: left, b: term() }
    }
    return left
  }
  function term(): Node {
    let left = unary()
    while (peek()?.t === 'op' && ((peek() as { v: string }).v === '*' || (peek() as { v: string }).v === '/')) {
      const op = (tokens[pos++] as { v: string }).v
      left = { k: 'bin', op, a: left, b: unary() }
    }
    return left
  }
  function unary(): Node {
    const t = peek()
    if (t?.t === 'op' && t.v === '-') {
      pos++
      return { k: 'neg', a: unary() }
    }
    if (t?.t === 'op' && t.v === '+') {
      pos++
      return unary()
    }
    return power()
  }
  function power(): Node {
    const base = primary()
    const t = peek()
    if (t?.t === 'op' && t.v === '^') {
      pos++
      return { k: 'bin', op: '^', a: base, b: unary() }
    }
    return base
  }
  function primary(): Node {
    const t = tokens[pos++]
    if (!t) throw new Error('Incomplete expression')
    if (t.t === 'num') return { k: 'num', v: t.v }
    if (t.t === 'lp') {
      const inner = expr()
      if (tokens[pos++]?.t !== 'rp') throw new Error('Missing )')
      return inner
    }
    if (t.t === 'id') {
      if (t.v === 'x') return { k: 'x' }
      if (t.v in CONSTANTS) return { k: 'num', v: CONSTANTS[t.v] }
      if (t.v in FUNCTIONS) return { k: 'fn', name: t.v, a: power() }
    }
    throw new Error('Unexpected token')
  }

  const node = expr()
  if (pos < tokens.length) throw new Error('Unexpected input')
  return node
}

function evaluate(node: Node, x: number): number {
  switch (node.k) {
    case 'num':
      return node.v
    case 'x':
      return x
    case 'neg':
      return -evaluate(node.a, x)
    case 'fn':
      return FUNCTIONS[node.name](evaluate(node.a, x))
    case 'bin': {
      const a = evaluate(node.a, x)
      const b = evaluate(node.b, x)
      if (node.op === '+') return a + b
      if (node.op === '-') return a - b
      if (node.op === '*') return a * b
      if (node.op === '/') return a / b
      return Math.pow(a, b)
    }
  }
}

export type CompiledFn = (x: number) => number

export function compileExpression(source: string): { fn: CompiledFn | null; error: string | null } {
  const trimmed = source.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=/i, '').trim()
  if (!trimmed) return { fn: null, error: null }
  try {
    const ast = parse(tokenize(trimmed))
    return { fn: (x: number) => evaluate(ast, x), error: null }
  } catch (e) {
    return { fn: null, error: e instanceof Error ? e.message : 'Invalid expression' }
  }
}
