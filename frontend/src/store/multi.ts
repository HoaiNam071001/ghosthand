// Chọn nhiều điểm + biến đổi hàng loạt (bước 30) và đổi vùng kèm cách xử lý các điểm.
import { tr } from '../i18n/lang';
import { anchorPoint, insideBounds } from '../anchor';
import { apply, IDENTITY, Mat, rectToRect, translate } from '../transform';
import { Point, Rect, Script, Step } from '../types';
import { getEditor, setEditor, setNotice, updateScript } from './editor';
import { boundsOf, endpoints, isAbsolute, pointKey, selectableIndexes, toScreen } from './geometry';

const script = () => getEditor().script;

export const setMulti = (multi: string[]) => setEditor({ multi });

// Toạ độ màn hình của các điểm đang chọn (khoá → điểm) theo kịch bản đã lưu; A "từ điểm trước" không chọn được.
export function selectedScreenPoints(): Map<string, Point> {
  const { script: sc, multi } = getEditor();
  const ends = endpoints(sc, sc.region);
  const out = new Map<string, Point>();
  sc.steps.forEach((s) => {
    const e = ends.get(s.id);
    if (!e) return;
    selectableIndexes(s).forEach((j) => {
      const p = s.type === 'drag' && j === 1 ? e.end : e.start;
      const k = pointKey(s.id, j);
      if (p && multi.includes(k)) out.set(k, p);
    });
  });
  return out;
}

// Phím của công cụ Chọn nhiều trên overlay: mod+A chọn mọi điểm của node đang bật, mũi tên dời 1 px (Shift 10 px).
// Trả true nếu đã xử lý (người gọi chặn mặc định của phím).
export function selectToolKey(key: string, mod: boolean, shift: boolean): boolean {
  if (key.toLowerCase() === 'a' && mod) {
    setMulti(script().steps.filter((s) => s.enabled).flatMap((s) => selectableIndexes(s).map((j) => pointKey(s.id, j))));
    return true;
  }
  const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[key];
  if (!d || !getEditor().multi.length) return false;
  const k = shift ? 10 : 1;
  transformSelected(translate(d[0] * k, d[1] * k), tr('mu.move'));
  return true;
}

const keysOf = (ids: string[]) => script().steps.filter((s) => ids.includes(s.id)).flatMap((s) => selectableIndexes(s).map((j) => pointKey(s.id, j)));

// Thẻ node: Shift / Cmd + click thêm / bỏ node khỏi nhóm đang chọn, kèm mọi điểm của nó (chọn nhiều điểm – bước 30).
export function toggleMultiStep(id: string) {
  if (!script().steps.some((x) => x.id === id)) return;
  const { multi, picked, selected } = getEditor();
  const base = picked.length ? picked : selected && selected !== id ? [selected] : [];
  const has = base.includes(id);
  const keys = keysOf([id]);
  setEditor({
    picked: has ? base.filter((x) => x !== id) : [...base, id],
    multi: has ? multi.filter((k) => !keys.includes(k)) : [...new Set([...multi, ...keysOf(base), ...keys])],
  });
}

// Chọn đúng các node này (kéo khung; [] = bỏ chọn nhóm): điểm chọn nhiều theo các node đó. Một node thì nó vào inspector.
export const selectNodes = (ids: string[]) =>
  setEditor({ picked: ids, multi: keysOf(ids), selected: ids.length === 1 ? ids[0] : getEditor().selected });

// Áp f (toạ độ màn hình → toạ độ màn hình) lên các điểm được chọn (pick), đổi khung tính từ vùng from sang to.
// Điểm thường: ghi lại theo neo hiện có trong khung mới. B "lệch so với A": véc-tơ đổi theo phần tuyến tính của f
// (f(A + Δ) − f(A), không cộng phần dời). Trả số điểm rơi ra ngoài khung mới – khác 0 thì người gọi không nên áp dụng.
function mapPoints(sc: Script, from: Rect | null, to: Rect | null, f: (p: Point) => Point, pick: (id: string, j: number) => boolean) {
  const ends = endpoints(sc, from);
  let outside = 0;
  const round = (p: Point) => ({ x: Math.round(p.x), y: Math.round(p.y) });
  const steps = sc.steps.map((s) => {
    if (!selectableIndexes(s).some((j) => pick(s.id, j))) return s;
    const nb = boundsOf(to, s);
    const points = s.points.map((p, j) => {
      if (!pick(s.id, j) || !selectableIndexes(s).includes(j)) return p;
      if (s.type === 'drag' && j === 1 && s.dragRelative) {
        const a = ends.get(s.id)?.start;
        if (!a) return p;
        const fa = f(a), fb = f({ x: a.x + p.x, y: a.y + p.y });
        return round({ x: fb.x - fa.x, y: fb.y - fa.y });
      }
      const q = round(f(toScreen(p, from, s)));
      if (!insideBounds(q, nb)) outside++;
      return anchorPoint(q, nb, p.ax, p.ay);
    });
    return { ...s, points };
  });
  return { steps, outside };
}

// Kịch bản như sẽ thành nếu áp m lên các điểm đang chọn – overlay vẽ xem trước bằng đúng logic ghi thật.
export function transformedSteps(m: Mat) {
  const sc = script();
  const sel = new Set(getEditor().multi);
  return mapPoints(sc, sc.region, sc.region, (p) => apply(m, p), (id, j) => sel.has(pointKey(id, j)));
}

// Biến đổi các điểm đang chọn nhiều bằng ma trận m (toạ độ màn hình). Điểm bị đẩy ra ngoài vùng → báo, không áp dụng.
export function transformSelected(m: Mat, what: string): boolean {
  const n = getEditor().multi.length;
  if (!n) return false;
  const r = transformedSteps(m);
  if (r.outside) {
    setNotice(tr('mu.outsideApply', { n: r.outside, what }));
    return false;
  }
  updateScript({ steps: r.steps });
  setNotice(tr('mu.done', { what, n, undo: `${navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl+'}Z` }));
  return true;
}

// Đặt toạ độ màn hình mới cho từng điểm đang chọn (căn chỉnh / chia đều / lật): next[khoá] → điểm mới.
// Hai lượt: ghi điểm thường trước, rồi tính lại B "lệch so với A" theo điểm bắt đầu mới (A có thể vừa dời).
export function moveSelectedTo(next: Map<string, Point>, what: string) {
  const sc = script();
  const round = (p: Point) => ({ x: Math.round(p.x), y: Math.round(p.y) });
  const isRel = (s: Step, j: number) => s.type === 'drag' && j === 1 && s.dragRelative;
  let outside = 0;
  const first = sc.steps.map((s) => ({
    ...s,
    points: s.points.map((p, j) => {
      const q = next.get(pointKey(s.id, j));
      if (!q || isRel(s, j)) return p;
      const b = boundsOf(sc.region, s);
      if (!insideBounds(round(q), b)) outside++;
      return anchorPoint(round(q), b, p.ax, p.ay);
    }),
  }));
  const ends = endpoints({ ...sc, steps: first }, sc.region);
  const steps = first.map((s) => ({
    ...s,
    points: s.points.map((p, j) => {
      const q = next.get(pointKey(s.id, j));
      const start = ends.get(s.id)?.start;
      if (!q || !isRel(s, j) || !start) return p;
      if (!insideBounds(round(q), boundsOf(sc.region, s))) outside++;
      return { x: Math.round(q.x) - start.x, y: Math.round(q.y) - start.y };
    }),
  }));
  if (outside) return setNotice(tr('mu.outside', { n: outside, what }));
  updateScript({ steps });
  setNotice(tr('mu.doneShort', { what, n: next.size }));
}

// ---- Đổi vùng: cách xử lý các điểm (bước 30) ----
// anchor: giữ theo neo (bước 29) · scale: giữ tỷ lệ vị trí trong vùng · screen: giữ nguyên chỗ trên màn hình
export type RegionMapMode = 'anchor' | 'scale' | 'screen';

export function regionMapping(to: Rect | null, mode: RegionMapMode) {
  const sc = script();
  const f = mode === 'scale' ? rectToRect(boundsOf(sc.region), boundsOf(to)) : IDENTITY;
  // node absolute không theo vùng – đổi vùng không dời điểm của nó
  const abs = new Set(sc.steps.filter(isAbsolute).map((s) => s.id));
  return mapPoints(sc, sc.region, to, (p) => apply(f, p), (id) => mode !== 'anchor' && !abs.has(id));
}

// Số điểm rơi ra ngoài vùng mới với từng cách – hiện trong hộp chọn.
export function mappingOutside(to: Rect | null, mode: RegionMapMode) {
  if (mode !== 'anchor') return regionMapping(to, mode).outside;
  const sc = script();
  let n = 0;
  endpoints(sc, to).forEach((e, id) => {
    const b = boundsOf(to, sc.steps.find((s) => s.id === id));
    [e.start, e.end].forEach((p, j) => {
      if (p && (j === 0 || e.end !== e.start) && !insideBounds(p, b)) n++;
    });
  });
  return n;
}

export function setRegionMapped(to: Rect | null, mode: RegionMapMode) {
  const { steps } = regionMapping(to, mode);
  updateScript({ region: to, steps });
  setNotice(to ? tr('mu.region', { w: to.w, h: to.h }) : tr('mu.full'));
}

// Đổi vùng; điểm lưu theo neo nên mỗi điểm bám theo cạnh / góc nó neo. null = toàn màn hình.
export const setRegion = (region: Rect | null) => updateScript({ region });

// Kịch bản có điểm nào phụ thuộc vùng không (không có thì đổi vùng khỏi hỏi).
export const hasPoints = () => script().steps.some((s) => selectableIndexes(s).length > 0);
