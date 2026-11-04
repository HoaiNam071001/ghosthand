// Chữ + hình của cây lần chạy (bước 60 V7): tiêu đề / dòng phụ của thẻ, pill giá trị VÀO / RA, đường dữ liệu đi vòng
// tránh thẻ. Logic thuần – components/runs/ chỉ vẽ.
import type { Step, StepResult } from '../types';
import type { RunRow } from '../components/flow/model';
import { valueText } from './runOutputs';
import { pick } from './dataView';
import { nodeTitle } from './view';
import type { DataSource, TreeNode } from './runTree';

const short = (v: string, n = 26) => (v.length > n ? `${v.slice(0, n - 1)}…` : v);
const ITEM_KEYS = ['text', 'name', 'ten', 'title'];

// Nhãn của lượt: phần tử đang xét (chữ / tên / số lượt)
function iterLabel(r: StepResult | undefined): string {
  const item = r?.output?.item;
  if (item && typeof item === 'object') {
    const k = ITEM_KEYS.find((x) => typeof (item as Record<string, unknown>)[x] === 'string');
    if (k) return short(String((item as Record<string, unknown>)[k]), 22);
  }
  return item !== undefined ? short(valueText(item), 22) : '';
}

export type CardText = { title: string; sub: string; subFail?: boolean; ms?: number };
export function cardText(n: TreeNode, results: StepResult[], steps: Step[], rows: RunRow[]): CardText {
  const step = steps.find((s) => s.id === n.nodeId);
  const name = step ? nodeTitle(step) : n.nodeId;
  const r = n.index !== undefined ? results[n.index] : undefined;
  const row = n.index !== undefined ? rows[n.index] : undefined;
  switch (n.kind) {
    case 'loop': {
      const fails = n.children.filter((c) => c.fail).length;
      return { title: name, sub: `${n.children.length} lượt${fails ? ` · ${fails} lượt lỗi` : ''}`, subFail: fails > 0 };
    }
    case 'iter': {
      const label = iterLabel(r);
      const bad = n.children.find((c) => c.fail);
      const badRef = bad && steps.find((s) => s.id === bad.nodeId)?.ref;
      return { title: `Lượt ${n.iter}${label ? ` · ${label}` : ''}`, sub: bad ? `lỗi ở ${badRef ?? '?'}` : 'xong', subFail: !!bad, ms: r?.durationMs }; // số node ở nút mở nhánh
    }
    case 'more': return { title: `${n.hidden} lượt nữa`, sub: 'bấm để hiện hết' };
    case 'done': return { title: step?.type === 'counter' ? 'Hết lượt' : 'Hết danh sách', sub: `→ ${row?.next ?? ''}`, ms: r?.durationMs };
    default: return { title: name, sub: `${row?.status === 'fail' ? 'Thất bại' : portName(row?.port)}${row?.next ? ` → ${row.next}` : ''}`, subFail: row?.status === 'fail', ms: r?.durationMs };
  }
}
const PORTS: Record<string, string> = { success: 'Thành công', fail: 'Thất bại', true: 'Đúng', false: 'Sai', item: 'Mỗi mục', done: 'Xong', next: 'Còn lượt', default: 'Khác', approve: 'Đồng ý', deny: 'Từ chối', timeout: 'Hết giờ' };
export const portName = (p?: string) => (p ? PORTS[p] ?? p.replace(/^case:/, 'case ') : '');

// Pill giá trị: VÀO = ô đọc biến (giá trị đã thay ở StepResult.input), RA = output được lần chạy sau dùng (không có thì 2 output đầu).
export type Pill = { id: string; label: string; value: string };
export function inPills(i: number, results: StepResult[], sources: DataSource[][]): Pill[] {
  const input = results[i]?.input ?? {};
  const seen = new Set<string>();
  return (sources[i] ?? []).filter((s) => !seen.has(s.slot) && seen.add(s.slot)).map((s) => ({
    id: s.slot, label: s.label, value: short(input[s.slot] !== undefined ? valueText(input[s.slot]) : '—'),
  }));
}
export function outPills(i: number, results: StepResult[], sources: DataSource[][]): Pill[] {
  const out = results[i]?.output;
  const keys = new Set<string>();
  sources.forEach((list) => list.forEach((s) => s.from === i && keys.add(s.key)));
  const list = keys.size ? [...keys] : Object.keys(out ?? {}).filter((k) => k !== 'startedAt' && k !== 'durationMs').slice(0, 2);
  return list.map((k) => { const v = pick(out, k); return { id: k, label: k, value: short(v === undefined ? '—' : valueText(v)) }; });
}

// Đường dữ liệu từ p (đáy nguồn) tới q (đỉnh nơi dùng): không vướng thẻ thì cong thẳng xuống; vướng thì đi làn bên phải
// các thẻ chắn rồi vào từ trên. Thẻ: {x, y, w, h}.
type Rect = { x: number; y: number; w: number; h: number };
export function dataPath(p: { x: number; y: number }, q: { x: number; y: number }, cards: Rect[]): string {
  const lo = Math.min(p.x, q.x) - 12, hi = Math.max(p.x, q.x) + 12;
  const block = cards.filter((c) => c.y > p.y && c.y + c.h < q.y && c.x < hi && c.x + c.w > lo);
  if (!block.length) {
    const m = (p.y + q.y) / 2;
    return `M${p.x} ${p.y} C${p.x} ${m} ${q.x} ${m} ${q.x} ${q.y}`;
  }
  const sx = Math.max(...block.map((c) => c.x + c.w)) + 30;
  return rounded([p, { x: p.x, y: p.y + 12 }, { x: sx, y: p.y + 12 }, { x: sx, y: q.y - 18 }, { x: q.x, y: q.y - 18 }, q], 8);
}

// Đường gấp khúc bo góc (luồng chạy toả / gom các lượt)
export function rounded(pts: { x: number; y: number }[], rad = 10): string {
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const r1 = Math.min(rad, Math.hypot(b.x - a.x, b.y - a.y) / 2), r2 = Math.min(rad, Math.hypot(c.x - b.x, c.y - b.y) / 2);
    d += ` L${b.x - Math.sign(b.x - a.x) * r1} ${b.y - Math.sign(b.y - a.y) * r1} Q${b.x} ${b.y} ${b.x + Math.sign(c.x - b.x) * r2} ${b.y + Math.sign(c.y - b.y) * r2}`;
  }
  const z = pts[pts.length - 1];
  return `${d} L${z.x} ${z.y}`;
}
