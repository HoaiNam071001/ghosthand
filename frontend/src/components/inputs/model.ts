// Input của kịch bản – phần dùng cho giao diện (tách biến, nhãn kiểu, hiển thị giá trị). Model ở types.ts (khớp inputs.go).
import { tr } from '../../i18n/lang';
import type { InputType, InputValue, ScriptInput } from '../../types';

export type { InputType, InputValue, ScriptInput };

export const INPUT_TYPE_LABEL: Record<InputType, string> = {
  get text() { return tr('inp.text'); },
  get multiline() { return tr('inp.multiline'); },
  get number() { return tr('inp.number'); },
  ms: 'ms',
  get bool() { return tr('inp.bool'); },
  get select() { return tr('inp.select'); },
};

// Input kèm thông tin hiển thị: bước nào dùng (ghim hoặc {{key}}), đơn vị / tiền tố trong ô.
export type InputView = ScriptInput & {
  usedBy: { n: string; title: string }[];
  unit?: string; // hiện bên phải ô (s, ms)
  prefix?: string; // hiện mờ bên trái ô (facebook.com/)
};

export const isValidKey = (k: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k);

// Tách chuỗi theo {{key}} (input) và {{n2.output.x}} (kết quả node, vars.go) – \{{ là ký tự {{ thật, không phải biến.
export type Segment = { text: string; varKey?: string; nodeVar?: string };
export function splitVars(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\\\{\{|\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}|\{\{\s*([A-Za-z][A-Za-z0-9_]*\.[A-Za-z0-9_.]+)\s*\}\}/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push(m[1] ? { text: m[0], varKey: m[1] } : m[2] ? { text: m[0], nodeVar: m[2] } : { text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export const varsIn = (text: string) => [...new Set(splitVars(text).flatMap((s) => (s.varKey ? [s.varKey] : [])))];

export const fmtValue = (v: InputValue | undefined, unit?: string) =>
  v === undefined || v === '' ? tr('inp.empty') : typeof v === 'boolean' ? (v ? tr('inp.on') : tr('inp.off')) : `${v}${unit ? ` ${unit}` : ''}`;
