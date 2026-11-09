// Công cụ "Chọn nhiều" trên overlay (bước 30): khung biến đổi quanh các điểm đang chọn + thanh ô nhập số + hộp ánh xạ
// khi đổi vùng. Toán ở transform.ts; ghi điểm (giữ neo, B "lệch so với A", điểm ra ngoài vùng) ở scriptStore.ts.
// Mọi phép tính làm trên toạ độ màn hình thật; khung vẽ theo toạ độ cửa sổ qua toClient.
import { MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { safeArea } from '../windowMode';
import {
  align, AlignOp, bbox, center, fromParams, IDENTITY, isNoTf, Mat, NO_TF, perspectiveCorner, rotateAbout, scaleAbout,
  skewXAbout, skewYAbout, TfParams, translate,
} from '../transform';
import { mappingOutside, moveSelectedTo, RegionMapMode, transformSelected } from '../store';
import { Point, Rect } from '../types';

const isMac = navigator.platform.startsWith('Mac');
export const modKeyName = isMac ? '⌘' : 'Ctrl';
const MIN_DRAG = 2; // px – nhỏ hơn coi như click
const PAD = 22; // khung cách các điểm

// Núm: (fx, fy) ∈ {0, .5, 1} theo khung; góc = 4 núm có fx, fy ≠ .5 – thứ tự góc khớp corners() (trên trái → phải → dưới phải → dưới trái).
const HANDLES: [number, number][] = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]];
const cornerIndex = (fx: number, fy: number) => (fy === 0 ? (fx === 0 ? 0 : 1) : fx === 1 ? 2 : 3);
const CURSOR: Record<string, string> = {
  '0,0': 'nwse-resize', '1,1': 'nwse-resize', '1,0': 'nesw-resize', '0,1': 'nesw-resize',
  '0.5,0': 'ns-resize', '0.5,1': 'ns-resize', '0,0.5': 'ew-resize', '1,0.5': 'ew-resize',
};

type Kind = 'move' | 'scale' | 'rotate' | 'skew' | 'persp';
const VERB: Record<Kind, string> = { move: 'di chuyển', scale: 'co giãn', rotate: 'xoay', skew: 'xiên', persp: 'biến dạng phối cảnh' };
type Gesture = { kind: Kind; fx: number; fy: number; box: Rect; m0: Point; moved: boolean };

const at = (r: Rect, fx: number, fy: number): Point => ({ x: r.x + r.w * fx, y: r.y + r.h * fy });

// Ma trận của thao tác kéo từ m0 tới m (toạ độ màn hình), đọc phím Shift / Alt lúc đang kéo.
function gestureMatrix(g: Gesture, m: Point, shift: boolean, alt: boolean): Mat {
  const { box, m0, fx, fy } = g;
  const c = center(box);
  switch (g.kind) {
    case 'move': {
      let dx = m.x - m0.x, dy = m.y - m0.y;
      if (shift) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0); // Shift: chỉ ngang / dọc
      return translate(dx, dy);
    }
    case 'scale': {
      const pivot = alt ? c : at(box, 1 - fx, 1 - fy); // Alt: co giãn từ tâm
      const h = at(box, fx, fy);
      const ratio = (cur: number, start: number, p: number, f: number) => (f === 0.5 || Math.abs(start - p) < 1 ? 1 : (cur - p) / (start - p));
      let sx = ratio(m.x, h.x, pivot.x, fx), sy = ratio(m.y, h.y, pivot.y, fy);
      if (shift) { // giữ tỷ lệ
        const s = fx === 0.5 ? sy : fy === 0.5 ? sx : Math.abs(sx) > Math.abs(sy) ? sx : sy;
        sx = sy = s;
      }
      return scaleAbout(sx, sy, pivot);
    }
    case 'rotate': {
      let deg = ((Math.atan2(m.y - c.y, m.x - c.x) - Math.atan2(m0.y - c.y, m0.x - c.x)) * 180) / Math.PI;
      if (shift) deg = Math.round(deg / 15) * 15;
      return rotateAbout(deg, c);
    }
    case 'skew': {
      if (fx === 0.5) { // cạnh trên / dưới: xiên ngang, cạnh đối diện đứng yên
        const py = at(box, 0, 1 - fy).y, hy = at(box, 0, fy).y;
        return Math.abs(hy - py) < 1 ? IDENTITY : skewXAbout((m.x - m0.x) / (hy - py), { x: c.x, y: py });
      }
      const px = at(box, 1 - fx, 0).x, hx = at(box, fx, 0).x;
      return Math.abs(hx - px) < 1 ? IDENTITY : skewYAbout((m.y - m0.y) / (hx - px), { x: px, y: c.y });
    }
    case 'persp':
      return perspectiveCorner(box, cornerIndex(fx, fy), m.x - m0.x, m.y - m0.y) ?? IDENTITY;
  }
}

// Kéo khung / núm / marker đã chọn. live: ma trận đang xem trước (null = không kéo). Thả chuột thì ghi vào kịch bản.
export function useTransformGesture(toScreen: (client: Point) => Point) {
  const [live, setLive] = useState<Mat | null>(null);
  const g = useRef<Gesture | null>(null);
  const liveRef = useRef<Mat | null>(null);
  const update = (m: Mat | null) => {
    liveRef.current = m;
    setLive(m);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cur = g.current;
      if (!cur) return;
      const m = toScreen({ x: e.clientX, y: e.clientY });
      if (!cur.moved && Math.hypot(m.x - cur.m0.x, m.y - cur.m0.y) < MIN_DRAG) return;
      cur.moved = true;
      update(gestureMatrix(cur, m, e.shiftKey, e.altKey));
    };
    const onUp = () => {
      const cur = g.current;
      g.current = null;
      if (cur?.moved && liveRef.current) transformSelected(liveRef.current, VERB[cur.kind]);
      update(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [toScreen]);

  // Bắt đầu kéo; ⌘ / Ctrl + núm cạnh = xiên, + núm góc = phối cảnh.
  const begin = (e: ReactMouseEvent, kind: Kind, box: Rect, fx = 0, fy = 0) => {
    e.stopPropagation();
    e.preventDefault();
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const k: Kind = kind === 'scale' && mod ? (fx === 0.5 || fy === 0.5 ? 'skew' : 'persp') : kind;
    g.current = { kind: k, fx, fy, box, m0: toScreen({ x: e.clientX, y: e.clientY }), moved: false };
  };
  // Esc khi đang kéo: huỷ, trả true để overlay không xử lý Esc tiếp.
  const cancel = () => {
    if (!g.current) return false;
    g.current = null;
    update(null);
    return true;
  };
  return { live, begin, cancel };
}

// Khung (toạ độ cửa sổ) quanh khung bao box (toạ độ màn hình), cách các điểm PAD.
export function frameRect(box: Rect, toClient: (p: Point) => Point): Rect {
  const a = toClient(box), b = toClient({ x: box.x + box.w, y: box.y + box.h });
  return { x: a.x - PAD, y: a.y - PAD, w: b.x - a.x + PAD * 2, h: b.y - a.y + PAD * 2 };
}

// Khung quanh các điểm đã chọn: thân kéo = di chuyển, 8 núm = co giãn (⌘ / Ctrl: xiên / phối cảnh), núm tròn = xoay.
export function TransformFrame({ box, toClient, begin, bad, single }: {
  box: Rect; // toạ độ màn hình, đang xem trước
  toClient: (p: Point) => Point;
  begin: (e: ReactMouseEvent, kind: Kind, box: Rect, fx?: number, fy?: number) => void;
  bad: boolean; // có điểm ra ngoài vùng
  single: boolean; // một điểm / mọi điểm thẳng hàng: chỉ di chuyển
}) {
  const r = frameRect(box, toClient);
  const color = bad ? 'border-danger' : 'border-accent';
  return (
    <div data-ui className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
      <div onMouseDown={(e) => begin(e, 'move', box)} title="Kéo để di chuyển (Shift: chỉ ngang / dọc) · phím mũi tên 1 px, Shift 10 px"
        className={`absolute inset-0 cursor-move border ${color} ${bad ? 'bg-danger/10' : 'bg-accent/5'}`} />
      {!single && HANDLES.map(([fx, fy]) => (
        <span key={`${fx},${fy}`} onMouseDown={(e) => begin(e, 'scale', box, fx, fy)} style={{ left: `${fx * 100}%`, top: `${fy * 100}%`, cursor: CURSOR[`${fx},${fy}`] }}
          title={fx === 0.5 || fy === 0.5 ? `Co giãn (Shift giữ tỷ lệ, Alt từ tâm) · ${modKeyName} + kéo: xiên` : `Co giãn (Shift giữ tỷ lệ, Alt từ tâm) · ${modKeyName} + kéo: phối cảnh`}
          className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border-[1.5px] ${color} bg-white`} />
      ))}
      {!single && (
        <>
          <span className={`pointer-events-none absolute -top-7 left-1/2 h-7 w-px -translate-x-1/2 ${bad ? 'bg-danger' : 'bg-accent'}`} />
          <span onMouseDown={(e) => begin(e, 'rotate', box)} title="Kéo để xoay (Shift: bước 15°)"
            className={`absolute -top-9 left-1/2 h-4 w-4 -translate-x-1/2 cursor-grab rounded-full border-[1.5px] ${color} bg-white`} />
        </>
      )}
    </div>
  );
}

// Thanh ô nhập số: ΔX ΔY / rộng cao % / xoay / xiên → xem trước, Áp dụng (Enter) ghi; căn chỉnh / chia đều / lật áp ngay.
const BAR_H = 64;
const BAR_TOP_MIN = 52; // dưới gợi ý một dòng (thanh công cụ tự ẩn)
const BAR_BOTTOM_GAP = 10; // cách mép vùng an toàn (đã trừ Dock / taskbar – safeArea)

// Thanh né khung (không che núm / điểm): dưới khung nếu đủ chỗ, không thì trên (chừa núm xoay), không nữa thì sát đáy.
function barTop(frame: Rect) {
  const { bottom } = safeArea();
  const below = frame.y + frame.h + 16;
  if (below + BAR_H <= bottom - BAR_BOTTOM_GAP) return Math.max(below, BAR_TOP_MIN);
  const above = frame.y - 48 - BAR_H;
  if (above >= BAR_TOP_MIN) return above;
  return bottom - BAR_BOTTOM_GAP - BAR_H;
}

export function TransformBar({ points, tf, setTf, frame, onQuad }: {
  points: Map<string, Point>; // điểm đang chọn (toạ độ màn hình hiện tại)
  tf: TfParams; setTf: (t: TfParams) => void;
  onQuad: () => void; // vào chế độ ánh xạ 4 mốc
  frame: Rect; // khung biến đổi (toạ độ cửa sổ) – thanh tránh đè lên
}) {
  const ps = [...points.values()];
  const c = center(bbox(ps));
  const dirty = !isNoTf(tf);
  // Kéo tay nắm "N điểm" để dời thanh (khi khung phủ gần hết màn hình, không chỗ nào tự né được) – nhớ tới khi đóng overlay.
  const [pos, setPos] = useState<Point | null>(null);
  const grab = (e: ReactMouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    const off = { x: e.clientX - el.x, y: e.clientY - el.y };
    const move = (ev: MouseEvent) => setPos({ x: ev.clientX - off.x, y: Math.max(0, ev.clientY - off.y) });
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  const applyTf = () => {
    if (dirty && transformSelected(fromParams(tf, c), 'biến đổi')) setTf(NO_TF);
  };
  const doAlign = (op: AlignOp, what: string) => {
    const out = align(ps, op);
    moveSelectedTo(new Map([...points.keys()].map((k, i) => [k, out[i]])), what);
  };
  const num = (k: keyof TfParams, label: string, unit: string) => (
    <label className="flex flex-col gap-0.5 text-[11px] text-hud-text/60">{label}
      <span className="flex h-8 w-[70px] items-center gap-1 rounded-md border border-hud-line bg-black/20 px-2 focus-within:ring-focus">
        <input value={tf[k]} inputMode="numeric"
          onChange={(e) => /^-?\d*\.?\d*$/.test(e.target.value) && setTf({ ...tf, [k]: Number(e.target.value) || 0 })}
          onKeyDown={(e) => e.key === 'Enter' && applyTf()}
          className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-white outline-none" />
        <span>{unit}</span>
      </span>
    </label>
  );
  const ico = (d: string, title: string, fn: () => void) => (
    <button title={title} aria-label={title} onClick={fn} disabled={ps.length < 2} className="grid h-8 w-8 place-items-center rounded-md enabled:hover:bg-white/10 disabled:opacity-30">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d={d} /></svg>
    </button>
  );
  return (
    <div data-ui style={pos ? { left: pos.x, top: pos.y } : { top: barTop(frame) }}
      className={`absolute ${pos ? '' : 'left-1/2 -translate-x-1/2'} flex items-end gap-3 whitespace-nowrap rounded-xl border border-hud-line bg-hud px-3 py-2.5 text-hud-text shadow-[0_12px_32px_rgb(0_0_0/.4)]`}>
      <span onMouseDown={grab} title="Kéo để dời thanh" className="flex cursor-grab items-center gap-1.5 self-center pr-1 text-[13px] active:cursor-grabbing">
        <svg width="8" height="14" viewBox="0 0 8 14" className="text-hud-text/50" aria-hidden>
          {[2, 7, 12].flatMap((y) => [2, 6].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.2" fill="currentColor" />))}
        </svg>
        <span><b className="text-white">{ps.length}</b> điểm</span>
      </span>
      {num('dx', 'ΔX', 'px')}{num('dy', 'ΔY', 'px')}
      {num('sx', 'Rộng', '%')}{num('sy', 'Cao', '%')}
      {num('rot', 'Xoay', '°')}
      {num('kx', 'Xiên X', '°')}{num('ky', 'Xiên Y', '°')}
      <span className="h-8 w-px self-end bg-white/16" />
      <div className="flex flex-col gap-0.5 text-[11px] text-hud-text/60">Căn / chia đều / lật
        <div className="flex">
          {ico('M4 4v16M8 8h10M8 16h6', 'Căn trái', () => doAlign('left', 'căn trái'))}
          {ico('M12 4v16M6 8h12M8 16h8', 'Căn giữa ngang', () => doAlign('hcenter', 'căn giữa'))}
          {ico('M20 4v16M6 8h10M10 16h6', 'Căn phải', () => doAlign('right', 'căn phải'))}
          {ico('M4 4h16M8 8v10M16 8v6', 'Căn trên', () => doAlign('top', 'căn trên'))}
          {ico('M4 12h16M8 6v12M16 8v8', 'Căn giữa dọc', () => doAlign('vcenter', 'căn giữa'))}
          {ico('M4 20h16M8 6v10M16 10v6', 'Căn dưới', () => doAlign('bottom', 'căn dưới'))}
          {ico('M4 6v12M12 6v12M20 6v12', 'Chia đều ngang', () => doAlign('hdist', 'chia đều'))}
          {ico('M6 4h12M6 12h12M6 20h12', 'Chia đều dọc', () => doAlign('vdist', 'chia đều'))}
          {ico('M12 3v18M8 7l-4 5 4 5M16 7l4 5-4 5', 'Lật ngang', () => doAlign('flipH', 'lật'))}
          {ico('M3 12h18M7 8l5-4 5 4M7 16l5 4 5-4', 'Lật dọc', () => doAlign('flipV', 'lật'))}
        </div>
      </div>
      <span className="h-8 w-px self-end bg-white/16" />
      <button onClick={onQuad} disabled={ps.length < 2} title="Kéo 4 góc khung tới 4 vị trí mới (phối cảnh)"
        className="h-8 self-end rounded-md px-2.5 text-[13px] enabled:hover:bg-white/10 disabled:opacity-30">4 mốc</button>
      <div className="flex gap-1.5">
        <button onClick={() => setTf(NO_TF)} disabled={!dirty} className="h-8 rounded-md px-2.5 text-[13px] enabled:hover:bg-white/10 disabled:opacity-40">Bỏ</button>
        <button onClick={applyTf} disabled={!dirty} className="btn-primary h-8 rounded-md px-3 text-[13px] font-semibold disabled:opacity-50">
          Áp dụng <span className="font-mono text-[11px] font-normal opacity-70">Enter</span>
        </button>
      </div>
    </div>
  );
}

// Vùng đổi khi đã có điểm: hỏi cách xử lý – xem trước ngay trên overlay theo cách đang chọn.
export const MAP_MODES: { id: RegionMapMode; title: string; hint: string }[] = [
  { id: 'anchor', title: 'Giữ theo neo', hint: 'Mỗi điểm giữ khoảng cách tới góc / cạnh đang neo (bước 29)' },
  { id: 'scale', title: 'Co giãn theo vùng', hint: 'Giữ tỷ lệ vị trí trong vùng: điểm ở giữa vùng cũ vẫn ở giữa vùng mới' },
  { id: 'screen', title: 'Giữ nguyên chỗ trên màn hình', hint: 'Toạ độ thật không đổi, chỉ tính lại theo vùng mới' },
];

export function MapDialog({ from, to, target, mode, setMode, onApply, onCancel }: {
  from: Rect; to: Rect; // khung cũ / mới (toàn màn hình = khung màn hình)
  target: Rect | null; // vùng mới như sẽ lưu (null = toàn màn hình)
  mode: RegionMapMode; setMode: (m: RegionMapMode) => void; onApply: () => void; onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onApply();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onApply, onCancel]);
  return (
    <div data-ui className="absolute top-[52px] left-2 w-[420px]"> {/* bên trái – chừa giữa màn hình để xem trước các điểm */}
      <div role="dialog" aria-label="Đổi vùng" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 text-ink shadow-[0_16px_48px_rgb(0_0_0/.4)]">
        <div>
          <div className="text-base font-semibold">Đổi vùng – xử lý các điểm thế nào?</div>
          <div className="font-mono text-[13px] text-muted">{from.w} × {from.h} → {to.w} × {to.h} · marker đang hiện theo cách đã chọn</div>
        </div>
        {MAP_MODES.map((m) => {
          const out = mappingOutside(target, m.id);
          return (
            <label key={m.id} className={`flex cursor-pointer gap-3 rounded-card p-3 ${mode === m.id ? 'ring-selected' : 'border border-line'}`}>
              <input type="radio" name="map" checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-1 accent-accent" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{m.title}</span>
                <span className="text-xs text-muted">{m.hint}</span>
                {out > 0 && <span className="text-xs text-warn">{out} điểm sẽ nằm ngoài vùng mới</span>}
              </span>
            </label>
          );
        })}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="h-9 rounded-control border border-line px-3.5 hover:bg-hover">Giữ vùng cũ</button>
          <button onClick={onApply} className="btn-primary h-9 rounded-control px-4 font-semibold">Đổi vùng <span className="font-mono text-[11px] font-normal opacity-70">Enter</span></button>
        </div>
      </div>
    </div>
  );
}

// Biến đổi chọn từ ô nhập số → ma trận xem trước (quanh tâm các điểm đang chọn).
export const paramsPreview = (tf: TfParams, ps: Point[]): Mat | null => (isNoTf(tf) || !ps.length ? null : fromParams(tf, center(bbox(ps))));
