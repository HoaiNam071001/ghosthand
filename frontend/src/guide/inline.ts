// Cú pháp nội dòng trong chữ hướng dẫn: **đậm**, *nghiêng*, `mã`, [[node:<InfoKey>]], [[chapter:<id>]] (cùng quy ước guide.go).
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'em'; v: string }
  | { t: 'code'; v: string }
  | { t: 'node'; v: string }
  | { t: 'chapter'; v: string };

const RE = /\*\*(.+?)\*\*|\*([^*]+)\*|`([^`]+)`|\[\[(node|chapter):([\w-]+)\]\]/g;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of s.matchAll(RE)) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: 'bold', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'em', v: m[2] });
    else if (m[3] !== undefined) out.push({ t: 'code', v: m[3] });
    else out.push({ t: m[4] as 'node' | 'chapter', v: m[5] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
  return out;
}

// Chữ trần để tìm kiếm: bỏ dấu cú pháp, link thay bằng nhãn.
export const plainText = (s: string, label: (t: 'node' | 'chapter', id: string) => string) =>
  parseInline(s).map((p) => (p.t === 'node' || p.t === 'chapter' ? label(p.t, p.v) : p.v)).join('');
