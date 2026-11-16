// Hình học vẽ trên overlay (toạ độ cửa sổ): marker, đường neo, mũi tên cuộn, nét node Vẽ đường, chỗ đặt nút khoanh ảnh.
import { tr } from '../i18n/lang';
import { fmtAxis } from '../anchor';
import { Point, Rect, Step, StepPoint } from '../types';
import { SCROLL_ARROW, scrollDelta } from '../scroll';
import { pathVertices } from '../flow/shape';

export const MIN_REGION = 10; // px – kéo nhỏ hơn coi như click nhầm

type ToClient = (p: Point) => Point;
type Ends = Map<string, { start: Point | null; end: Point | null; pts?: (Point | null)[] }>;

export const rectOf = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y),
});

export const cornersOf = (r: Rect): Point[] => [
  { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x, y: r.y + r.h }, { x: r.x + r.w, y: r.y + r.h },
];

// key: khoá chọn nhiều; at: toạ độ cửa sổ; scr: toạ độ màn hình (đang xem trước nếu đang biến đổi).
// ghost: điểm A của bước kéo "từ điểm trước" – trùng marker bước trước nên không vẽ, chỉ dùng cho đường nối.
// pt: điểm đã lưu (có neo) – không có với A "từ điểm trước" và B "lệch so với A".
export type Marker = {
  id: string; index: number; key: string; label: string; at: Point; scr: Point; drag: boolean; jitter: number; ghost: boolean; pt?: StepPoint;
};

// Marker của các node đang bật, ghi mã node (n2); kéo thả có A và B. Marker đang kéo (dragging) vẽ theo con trỏ.
export function buildMarkers(
  steps: Step[], ends: Ends, toClient: ToClient, keyOf: (id: string, index: number) => string,
  dragging: { id: string; index: number } | null, cursor: Point,
): Marker[] {
  const out: Marker[] = [];
  steps.forEach((s) => {
    const e = ends.get(s.id);
    if (!e) return;
    const pts = s.type === 'drag' ? [e.start, e.end] : s.type === 'path' && !s.shape ? e.pts ?? [] : [e.start];
    pts.forEach((p, j) => {
      if (!p) return;
      const isDragging = dragging?.id === s.id && dragging.index === j;
      out.push({
        id: s.id, index: j, key: keyOf(s.id, j), label: s.type === 'drag' ? `${s.ref}${j === 0 ? 'A' : 'B'}` : pts.length > 1 ? `${s.ref}·${j + 1}` : s.ref,
        at: isDragging ? cursor : toClient(p), scr: p, drag: s.type === 'drag', jitter: s.jitterPx,
        ghost: s.type === 'drag' && j === 0 && s.dragFromPrev,
        pt: s.type === 'drag' && (j === 0 ? s.dragFromPrev : s.dragRelative) ? undefined : s.points[j],
      });
    });
  });
  return out;
}

// Nét của node Vẽ đường (toạ độ cửa sổ) – vẽ trước trên overlay đúng hình sẽ vẽ.
export function pathOutlines(steps: Step[], ends: Ends, toClient: ToClient): { id: string; pts: Point[] }[] {
  return steps.flatMap((s) => {
    const v = s.type === 'path' && s.enabled ? pathVertices(s, ends.get(s.id)?.pts ?? []) : null;
    return v && v.length > 1 ? [{ id: s.id, pts: v.map(toClient) }] : [];
  });
}

export type AnchorLine = { key: string; x1: number; y1: number; x2: number; y2: number; text: string };

// Đường neo (bước 29): từ marker tới cạnh / giữa của khung (toạ độ cửa sổ) mà điểm đang neo – ngang cho X, dọc cho Y.
// frame: khung neo, hoặc hàm theo id node (node coordSpace absolute neo theo màn hình, không theo vùng).
export function anchorLinesOf(markers: Marker[], frame: Rect | ((id: string) => Rect)): AnchorLine[] {
  const edge = (a: StepPoint['ax'], o: number, size: number) => (a === 'end' ? o + size : a === 'center' ? o + size / 2 : o);
  return markers.flatMap((m) => {
    if (!m.pt) return [];
    const p = m.pt;
    const f = typeof frame === 'function' ? frame(m.id) : frame;
    const ex = edge(p.ax, f.x, f.w);
    const ey = edge(p.ay, f.y, f.h);
    return [
      { key: `${m.label}x`, x1: ex, y1: m.at.y, x2: m.at.x, y2: m.at.y, text: fmtAxis(p.x, p.ax) },
      { key: `${m.label}y`, x1: m.at.x, y1: ey, x2: m.at.x, y2: m.at.y, text: fmtAxis(p.y, p.ay) },
    ];
  });
}

export type ScrollArrow = { id: string; a: Point; tip: Point; cut: boolean; text: string };

const ARROW_PAD = 12; // px – đầu mũi tên giữ cách mép cửa sổ

// Bước cuộn tại điểm: mũi tên dài đúng quãng cuộn ước tính, giữ trong cửa sổ (cut = bị cắt bớt).
export function scrollArrowsOf(steps: Step[], ends: Ends, toClient: ToClient, win: { w: number; h: number }): ScrollArrow[] {
  return steps.flatMap((s) => {
    const at = s.type === 'scroll' ? ends.get(s.id)?.start : null;
    if (!at) return [];
    const d = scrollDelta(s);
    const raw = toClient({ x: at.x + d.x, y: at.y + d.y });
    const clamp = (v: number, max: number) => Math.min(Math.max(v, ARROW_PAD), max - ARROW_PAD);
    const tip = { x: clamp(raw.x, win.w), y: clamp(raw.y, win.h) };
    return [{
      id: s.id, a: toClient(at), tip, cut: tip.x !== raw.x || tip.y !== raw.y,
      text: tr('gm.scroll', { r: s.ref, a: SCROLL_ARROW[s.direction ?? 'down'], n: s.amount ?? 0, px: Math.abs(d.x || d.y) }),
    }];
  });
}

// Thanh nút "Dùng ảnh này / Khoanh lại" quanh khung khoanh ảnh r, trong vùng an toàn (không nằm dưới Dock):
// dưới khung → trên khung → bên cạnh khung. Nhãn cỡ ở trên khung, trừ khi thanh nút đang nằm trên khung.
export const CAPTURE_BAR = { w: 340, h: 52, gap: 12, hintH: 56 }; // hintH: chừa thanh gợi ý trên cùng

export function captureLayout(r: Rect, safe: { top: number; bottom: number }, winW: number, confirmed: boolean) {
  const { w: BW, h: BH, gap: G } = CAPTURE_BAR;
  const minTop = safe.top + CAPTURE_BAR.hintH;
  const fitBelow = r.y + r.h + G + BH <= safe.bottom;
  const fitAbove = r.y - G - BH >= minTop;
  const side = !fitBelow && !fitAbove;
  const left = side
    ? (r.x + r.w + G + BW <= winW ? r.x + r.w + G : Math.max(r.x - G - BW, 8))
    : Math.min(Math.max(r.x, 8), winW - BW - 8);
  const top = fitBelow ? r.y + r.h + G : fitAbove ? r.y - G - BH : Math.min(Math.max(r.y, minTop), safe.bottom - BH - G);
  const labelTop = confirmed && !fitBelow && fitAbove ? r.y + r.h + 6 : Math.max(r.y - 30, 4);
  return { left, top, labelTop };
}
