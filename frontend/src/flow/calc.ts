// Bộ tính node Tính toán (bước 42 G4a) – cùng cú pháp + kết quả với Go script/calc.go (test chung testdata/calc.json).
// Inspector dùng để xem trước kết quả / báo lỗi cú pháp; lúc chạy Go tính.

import { tr } from '../i18n/lang';
export type CalcValue = number | string | boolean;

// Lỗi cú pháp: sai ngay cả khi chưa có giá trị biến. Lỗi khác (chia 0, sai kiểu) chỉ biết khi chạy.
export class CalcSyntaxError extends Error {}

type Tok = { kind: 'n' | 's' | 'w' | 'o'; s: string; n?: number };

const OPS = ['==', '!=', '<=', '>=', '&&', '||', '+', '-', '*', '/', '%', '(', ')', ',', '<', '>', '!'];
const NUM_RE = /^-?\d+(\.\d+)?$/;
const VAR_RE = /\\\{\{|\{\{\s*[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_.]+)?\s*\}\}/g;
const ARITY: Record<string, [number, number]> = { round: [1, 2], floor: [1, 1], ceil: [1, 1], abs: [1, 1], min: [1, 99], max: [1, 99] };

const syn = (msg: string) => new CalcSyntaxError(msg);
// Nửa lên như Go calcRound (Go math.Round làm tròn xa 0).
const roundHalfUp = (x: number) => Math.floor(x + 0.5);

// Giá trị biến chèn vào biểu thức: số / true / false giữ nguyên, còn lại thành chuỗi "…" (như Go CalcQuote).
export function calcQuote(v: string): string {
  const t = v.trim();
  if (NUM_RE.test(t) || t === 'true' || t === 'false') return t;
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const isDigit = (c: string) => c >= '0' && c <= '9';
  const isWord = (c: string) => /[A-Za-z_0-9]/.test(c);
  while (i < src.length) {
    const c = src[i];
    if (' \t\n\r'.includes(c)) { i++; continue; }
    if (isDigit(c) || c === '.') {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++;
      const t = src.slice(i, j);
      if (!/^\d+(\.\d+)?$/.test(t)) throw syn(tr('calc.notNum', { t }));
      out.push({ kind: 'n', s: t, n: Number(t) }); i = j; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      for (; j < src.length && src[j] !== '"'; j++) {
        if (src[j] === '\\' && j + 1 < src.length) j++;
        s += src[j];
      }
      if (j >= src.length) throw syn(tr('calc.noClose'));
      out.push({ kind: 's', s }); i = j + 1; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && isWord(src[j])) j++;
      out.push({ kind: 'w', s: src.slice(i, j).toLowerCase() }); i = j; continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw syn(tr('calc.badChar', { c: String.fromCodePoint(src.codePointAt(i)!) }));
    out.push({ kind: 'o', s: op }); i += op.length;
  }
  return out;
}

function show(v: CalcValue): string {
  return typeof v === 'string' ? tr('calc.showText', { v }) : String(v);
}

function nums(a: CalcValue, b: CalcValue, op: string): [number, number] {
  if (typeof a !== 'number') throw new Error(tr('calc.needNum', { op, v: show(a) }));
  if (typeof b !== 'number') throw new Error(tr('calc.needNum', { op, v: show(b) }));
  return [a, b];
}

function bool(v: CalcValue, op: string): boolean {
  if (typeof v !== 'boolean') throw new Error(tr('calc.needBool', { op, v: show(v) }));
  return v;
}

class Parser {
  i = 0;
  constructor(private toks: Tok[]) {}

  get rest() { return this.i < this.toks.length ? this.toks[this.i] : undefined; }

  eat(...ss: string[]): string | undefined {
    const t = this.rest;
    if (!t || (t.kind !== 'o' && t.kind !== 'w') || !ss.includes(t.s)) return undefined;
    this.i++;
    return t.s;
  }

  or = (): CalcValue => this.logic(this.and, 'or', '||');
  and = (): CalcValue => this.logic(this.not, 'and', '&&');

  logic(next: () => CalcValue, ...ops: string[]): CalcValue {
    let a = next();
    for (let op = this.eat(...ops); op; op = this.eat(...ops)) {
      const b = next();
      const x = bool(a, op), y = bool(b, op);
      a = ops[0] === 'or' ? x || y : x && y;
    }
    return a;
  }

  not = (): CalcValue => {
    const op = this.eat('not', '!');
    return op ? !bool(this.not(), op) : this.compare();
  };

  compare(): CalcValue {
    const a = this.sum();
    const op = this.eat('==', '!=', '<=', '>=', '<', '>');
    if (!op) return a;
    const b = this.sum();
    if (op === '==') return a === b;
    if (op === '!=') return a !== b;
    const [x, y] = nums(a, b, op);
    return op === '<' ? x < y : op === '<=' ? x <= y : op === '>' ? x > y : x >= y;
  }

  sum = (): CalcValue => this.arith(this.product, '+', '-');
  product = (): CalcValue => this.arith(this.unary, '*', '/', '%');

  arith(next: () => CalcValue, ...ops: string[]): CalcValue {
    let a = next();
    for (let op = this.eat(...ops); op; op = this.eat(...ops)) {
      const [x, y] = nums(a, next(), op);
      if ((op === '/' || op === '%') && y === 0) throw new Error('chia cho 0');
      a = op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : op === '/' ? x / y : x % y;
    }
    return a;
  }

  unary = (): CalcValue => {
    if (this.eat('-')) return -nums(this.unary(), 0, '-')[0];
    return this.primary();
  };

  primary(): CalcValue {
    const t = this.rest;
    if (!t) throw syn(tr('calc.endNum'));
    this.i++;
    if (t.kind === 'n') return t.n!;
    if (t.kind === 's') return t.s;
    if (t.kind === 'o' && t.s === '(') {
      const v = this.or();
      if (!this.eat(')')) throw syn(tr('calc.noParen'));
      return v;
    }
    if (t.kind === 'w' && (t.s === 'true' || t.s === 'false')) return t.s === 'true';
    if (t.kind === 'w') return this.call(t.s);
    throw syn(tr('calc.beforeNum', { s: t.s }));
  }

  call(name: string): number {
    const lim = ARITY[name];
    if (!lim) throw syn(tr('calc.noFn', { n: name }));
    if (!this.eat('(')) throw syn(tr('calc.needOpen', { n: name }));
    const args: number[] = [];
    do args.push(nums(this.or(), 0, name)[0]); while (this.eat(','));
    if (!this.eat(')')) throw syn(tr('calc.fnNoParen', { n: name }));
    if (args.length < lim[0] || args.length > lim[1]) throw syn(tr('calc.argc', { n: name, a: lim[0], b: lim[1], c: args.length }));
    const [x] = args;
    switch (name) {
      case 'round': { const k = args.length === 2 ? 10 ** roundHalfUp(args[1]) : 1; return roundHalfUp(x * k) / k; }
      case 'floor': return Math.floor(x);
      case 'ceil': return Math.ceil(x);
      case 'abs': return Math.abs(x);
      case 'min': return Math.min(...args);
      default: return Math.max(...args);
    }
  }
}

// Tính biểu thức đã thay biến. Lỗi: CalcSyntaxError (cú pháp) hoặc Error (lúc tính).
export function evalCalc(expr: string): CalcValue {
  if (!expr.trim()) throw syn(tr('calc.empty'));
  if (expr.includes('{{')) throw new Error(tr('calc.unreplaced', { e: expr }));
  const p = new Parser(lex(expr));
  let v = p.or();
  if (p.rest) throw syn(tr('calc.extra', { s: p.rest.s }));
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(tr('calc.inf'));
    if (Math.abs(v) < 1e15) v = roundHalfUp(v * 1e10) / 1e10;
  }
  return v;
}

// Lỗi cú pháp của biểu thức còn {{biến}} (biến tạm coi là số 1) – như Go CheckCalc; undefined = ổn.
export function checkCalc(expr: string): string | undefined {
  try {
    evalCalc(expr.replace(VAR_RE, '1'));
  } catch (e) {
    if (e instanceof CalcSyntaxError) return e.message;
  }
  return undefined;
}

// Kết quả xem trước trong inspector: chỉ tính được khi không còn biến.
export function calcPreview(expr: string): { value?: string; error?: string; needsRun?: boolean } {
  const error = checkCalc(expr);
  if (error) return { error };
  if (expr.includes('{{')) return { needsRun: true };
  try {
    return { value: String(evalCalc(expr)) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
