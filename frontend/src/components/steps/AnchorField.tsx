// Ô vị trí có neo theo cạnh vùng (bước 29): mỗi trục neo riêng.
// X: + = cách cạnh trái, − = cách cạnh phải; Y: + = cách cạnh trên, − = cách cạnh dưới. Gõ số âm là đổi neo.
// Lưới 3×3 chọn neo (4 góc, giữa cạnh, tâm), "%" = theo tỷ lệ cạnh vùng (co giãn theo vùng).
// Có bounds (design v3): sơ đồ thu gọn thành một hàng tóm tắt khoảng cách, bấm mới mở sơ đồ + px / %.
import { tr, useT } from '../../i18n';
import { ReactNode, useState } from 'react';
import { Chevron } from '../icons';
import NumInput from '../NumInput';
import { Target } from '../icons';
import { anchorSummary, fmtAxis, RATIO_SCALE, resolvePoint } from '../../anchor';
import { Anchor, Point, Rect, StepPoint } from '../../types';

type Props = {
  value: StepPoint;
  onChange: (v: StepPoint) => void; // gõ số: đổi vị trí (số âm ở trục start → neo end)
  // Đổi neo (lưới, nút %): có thì gọi thay onChange để nơi dùng tính lại số, giữ nguyên chỗ trên màn hình.
  onAnchor?: (ax: Anchor, ay: Anchor) => void;
  disabled?: boolean;
  pick?: ReactNode; // nút chọn trên màn hình (mặc định: nút mẫu không làm gì – màn #demo)
  menu?: ReactNode; // nút ⋯ cuối hàng ô (lấy từ biến, px / % – PointSource)
  // Khung đang neo (vùng / màn hình, toạ độ robotgo): có thì hiện bản đồ thu nhỏ thay cho lưới 3×3 nhỏ.
  bounds?: Rect;
  boundsLabel?: string; // "Vùng" | "Màn hình"
  grid?: boolean; // false: không có lưới 3×3 nhỏ (kéo thả dùng chung một bản đồ AnchorMap bên ngoài)
};

const AXES: Anchor[] = ['start', 'center', 'end'];
const axisOf = (a: Anchor | undefined): Anchor => a ?? 'start';

// Giá trị hiện trong ô theo neo: start → +n, end → −n, center → lệch so với giữa (có dấu), ratio → %
const shown = (n: number, a: Anchor) => (a === 'end' ? -n : n);
// Số âm (kể cả "-0") → neo phải / dưới, số dương → trái / trên, 0 giữ neo cũ.
const parse = (n: number, a: Anchor): { n: number; a: Anchor } =>
  a === 'ratio' || a === 'center' ? { n, a }
    : n < 0 || Object.is(n, -0) ? { n: -n, a: 'end' } : n > 0 ? { n, a: 'start' } : { n, a };

export function anchorHint({ x, y, ax, ay }: StepPoint) {
  const part = (n: number, a: Anchor, horizontal: boolean) => {
    const [near, far, mid] = horizontal ? [tr('anc.left'), tr('anc.right'), tr('anc.midX')] : [tr('anc.top'), tr('anc.bottom'), tr('anc.midY')];
    return a === 'start' ? tr('anc.edge', { side: near, n }) : a === 'end' ? tr('anc.edge', { side: far, n })
      : a === 'center' ? `${mid} ${n >= 0 ? '+' : ''}${n} px` : tr(horizontal ? 'anc.pctW' : 'anc.pctH', { n: Number((n / 100).toFixed(2)) });
  };
  return `${part(x, axisOf(ax), true)} · ${part(y, axisOf(ay), false)}`;
}

// Mở / đóng sơ đồ nhớ chung trong phiên – chọn node khác vẫn giữ.
let mapOpen = false;

export default function AnchorField({ value: v, onChange, onAnchor, disabled, pick, menu, bounds, boundsLabel = tr('anc.region'), grid = true }: Props) {
  const t = useT();
  const [open, setOpen] = useState(mapOpen);
  const ratio = v.ax === 'ratio';
  const setAxis = (k: 'x' | 'y', n: number) => {
    const r = parse(n, axisOf(k === 'x' ? v.ax : v.ay));
    onChange(k === 'x' ? { ...v, x: r.n, ax: r.a } : { ...v, y: r.n, ay: r.a });
  };
  const anchor = (ax: Anchor, ay: Anchor, demo: Partial<StepPoint> = {}) =>
    onAnchor ? onAnchor(ax, ay) : onChange({ ...v, ax, ay, ...demo });
  const toggleRatio = () => (ratio ? anchor('start', 'start') : anchor('ratio', 'ratio', { x: RATIO_SCALE / 2, y: RATIO_SCALE / 2 }));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {(['x', 'y'] as const).map((k) => {
          const a = axisOf(k === 'x' ? v.ax : v.ay);
          return (
            <NumInput key={k} signed prefix={k.toUpperCase()} unit={a === 'ratio' ? '%' : undefined} scale={a === 'ratio' ? 100 : 1}
              value={shown(v[k], a)} onChange={(n) => !disabled && setAxis(k, n)} className="min-w-0 flex-1" />
          );
        })}
        {!bounds && grid && <AnchorGrid value={v} onChange={(ax, ay) => anchor(ax, ay)} disabled={disabled} />}
        {pick ?? (
          <button disabled={disabled} title={t('anc.pickScreen')} aria-label={t('anc.pickScreen')}
            className="grid h-[34px] w-[34px] flex-none place-items-center rounded-control border border-line text-muted enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-50"><Target /></button>
        )}
        {menu}
      </div>
      {bounds ? (
        <>
          <button type="button" onClick={() => { mapOpen = !open; setOpen(!open); }} aria-expanded={open} aria-label={t('anc.mapOf', { name: boundsLabel.toLowerCase() })}
            className="flex h-8 items-center gap-1.5 rounded-control px-2 text-left text-[12.5px] text-muted hover:bg-hover hover:text-ink">
            <Chevron open={open} /><span className="flex-none whitespace-nowrap">{t('anc.map')}</span>
            <span className="ml-auto min-w-0 truncate font-mono text-[11.5px]" title={anchorHint(v)}>{anchorSummary(v)}</span>
          </button>
          {open && (
            <div className="flex flex-col gap-2 rounded-card bg-soft p-2.5">
              <span className="text-xs text-muted">{t('anc.clickDot')}</span>
              <AnchorMap value={v} bounds={bounds} label={boundsLabel} disabled={disabled} onAnchor={(ax, ay) => anchor(ax, ay)} />
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="min-w-0 flex-1">{anchorHint(v)}</span>
                <RatioToggle ratio={ratio} disabled={disabled} onToggle={toggleRatio} />
              </span>
            </div>
          )}
        </>
      ) : (
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="min-w-0 flex-1">{anchorHint(v)}</span>
          <RatioToggle ratio={ratio} disabled={disabled} onToggle={toggleRatio} />
        </span>
      )}
    </div>
  );
}

// px / %: theo tỷ lệ thì điểm co giãn theo vùng thay vì giữ khoảng cách tới cạnh
function RatioToggle({ ratio, disabled, onToggle }: { ratio: boolean; disabled?: boolean; onToggle: () => void }) {
  const t = useT();
  const opt = 'px-2 py-px font-mono text-[11px]';
  return (
    <span role="radiogroup" aria-label={t('anc.unit')} title={t('anc.unitTip')}
      className={`flex flex-none overflow-hidden rounded-full border border-line ${disabled ? 'opacity-50' : ''}`}>
      <button role="radio" aria-checked={!ratio} disabled={disabled} onClick={() => ratio && onToggle()} className={`${opt} ${ratio ? 'enabled:hover:bg-hover' : 'bg-accent-soft text-accent-text'}`}>px</button>
      <button role="radio" aria-checked={ratio} disabled={disabled} onClick={() => !ratio && onToggle()} className={`${opt} ${ratio ? 'bg-accent-soft text-accent-text' : 'enabled:hover:bg-hover'}`}>%</button>
    </span>
  );
}

// Lưới 3×3: chấm đang chọn = neo hiện tại của (X, Y)
export function AnchorGrid({ value: v, onChange, disabled }: { value: StepPoint; onChange: (ax: Anchor, ay: Anchor) => void; disabled?: boolean }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t('anc.corner')} title={t('anc.cornerTip')}
      className={`grid h-8 w-8 flex-none grid-cols-3 place-items-center rounded-control border border-line bg-field p-[3px] ${disabled ? 'opacity-50' : ''}`}>
      {AXES.flatMap((ay) => AXES.map((ax) => {
        const on = axisOf(v.ax) === ax && axisOf(v.ay) === ay;
        return (
          <button key={`${ax}${ay}`} role="radio" aria-checked={on} disabled={disabled} aria-label={t('anc.anchor', { name: `${ay === 'start' ? t('anc.top') : ay === 'end' ? t('anc.bottom') : t('anc.mid')} ${ax === 'start' ? t('anc.left') : ax === 'end' ? t('anc.right') : t('anc.mid')}` })}
            onClick={() => onChange(ax, ay)}
            className="grid h-full w-full place-items-center">
            <span className={`block rounded-full ${on ? 'h-[7px] w-[7px] bg-accent' : 'h-[3px] w-[3px] bg-muted/60'}`} />
          </button>
        );
      }))}
    </div>
  );
}

// Bản đồ thu nhỏ của vùng theo đúng tỷ lệ: 9 chấm neo (4 góc, giữa cạnh, tâm) bấm để đổi neo của value,
// đường từ cạnh / giữa đang neo tới điểm kèm khoảng cách – giống đường neo trên overlay.
// Kéo thả: một bản đồ cho cả A và B (marks + arrow), value là điểm đang chọn để đổi neo.
const MAP_W = 268;
const MAP_H = 150;
const POS = [0, 0.5, 1];
const ANCHORS = ['start', 'center', 'end'] as const;

export type MapMark = { at: Point; text: string; active?: boolean }; // toạ độ màn hình

export function AnchorMap({ value: v, bounds: b, label, marks = [], arrow, disabled, onAnchor }: {
  value?: StepPoint; // điểm đổi neo được (vẽ đường neo + bật 9 chấm); không có thì chỉ xem
  bounds: Rect; label: string; marks?: MapMark[]; arrow?: [Point, Point] | null;
  disabled?: boolean; onAnchor?: (ax: Anchor, ay: Anchor) => void;
}) {
  const t = useT();
  const k = Math.min(MAP_W / Math.max(b.w, 1), MAP_H / Math.max(b.h, 1));
  const w = Math.round(b.w * k);
  const h = Math.round(b.h * k);
  const at = (p: Point) => ({ x: (p.x - b.x) * k, y: (p.y - b.y) * k });
  const edge = (a: Anchor, size: number) => (a === 'end' ? size : a === 'center' ? size / 2 : 0);
  const ax = v && axisOf(v.ax);
  const ay = v && axisOf(v.ay);
  const p = v && at(resolvePoint(v, b));
  const ex = ax ? edge(ax, w) : 0;
  const ey = ay ? edge(ay, h) : 0;
  const ar = arrow && [at(arrow[0]), at(arrow[1])];
  const name = (x: Anchor, y: Anchor) =>
    x === 'center' && y === 'center' ? t('anc.centre') : `${y === 'start' ? t('anc.top') : y === 'end' ? t('anc.bottom') : t('anc.mid')} ${x === 'start' ? t('anc.left') : x === 'end' ? t('anc.right') : t('anc.mid')}`;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative rounded-[6px] border border-line-strong bg-field" style={{ width: w + 2, height: h + 2 }}>
        <svg width={w} height={h} className="absolute inset-0 overflow-visible" aria-hidden>
          <defs>
            <marker id="map-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0 10 5 0 10z" className="fill-ink" />
            </marker>
          </defs>
          {/* lưới mờ chia đôi */}
          <path d={`M${w / 2} 0V${h}M0 ${h / 2}H${w}`} className="stroke-line" strokeDasharray="2 4" />
          {ar && <line x1={ar[0].x} y1={ar[0].y} x2={ar[1].x} y2={ar[1].y} className="stroke-ink" strokeWidth={1.5} opacity={0.6} markerEnd="url(#map-ah)" />}
          {/* đường neo: ngang (trục X) và dọc (trục Y) */}
          {v && p && (
            <>
              <line x1={ex} y1={p.y} x2={p.x} y2={p.y} className="stroke-accent" strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={p.x} y1={ey} x2={p.x} y2={p.y} className="stroke-accent" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={(ex + p.x) / 2} y={p.y - 6} textAnchor="middle" className="fill-accent-text font-mono text-[10px]">{fmtAxis(v.x, v.ax)}</text>
              <text x={p.x + 6} y={(ey + p.y) / 2 + 3} className="fill-accent-text font-mono text-[10px]">{fmtAxis(v.y, v.ay)}</text>
            </>
          )}
          {marks.map((m) => {
            const q = at(m.at);
            return (
              <g key={m.text} opacity={m.active ? 1 : 0.55}>
                <circle cx={q.x} cy={q.y} r={m.active ? 7 : 6} className={m.active ? 'fill-accent stroke-surface' : 'fill-muted stroke-surface'} strokeWidth={2} />
                <text x={q.x} y={q.y + 3} textAnchor="middle" className={`font-sans text-[8px] font-bold ${m.active ? 'fill-on-accent' : 'fill-surface'}`}>{m.text}</text>
              </g>
            );
          })}
          {p && !marks.length && <circle cx={p.x} cy={p.y} r={5} className="fill-accent stroke-surface" strokeWidth={2} />}
        </svg>
        {/* 9 chấm neo – vùng bấm 20×20; chỉ khi có điểm đổi neo được */}
        {v && onAnchor && (
          <div role="radiogroup" aria-label={t('anc.corner')}>
            {POS.flatMap((fy, iy) => POS.map((fx, ix) => {
              const nx = ANCHORS[ix];
              const ny = ANCHORS[iy];
              const on = ax === nx && ay === ny;
              return (
                <button key={`${ix}${iy}`} role="radio" aria-checked={on} disabled={disabled} title={t('anc.anchor', { name: name(nx, ny) })} aria-label={t('anc.anchor', { name: name(nx, ny) })}
                  onClick={() => onAnchor(nx, ny)} style={{ left: 1 + fx * w, top: 1 + fy * h }}
                  className="group absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full disabled:opacity-50">
                  <span className={`block rounded-full transition-all ${on ? 'h-3 w-3 bg-accent ring-2 ring-surface' : 'h-2 w-2 border border-line-strong bg-surface group-enabled:group-hover:h-3 group-enabled:group-hover:w-3 group-enabled:group-hover:border-accent'}`} />
                </button>
              );
            }))}
          </div>
        )}
      </div>
      <span className="font-mono text-[11px] text-muted">{label} {b.w} × {b.h}</span>
    </div>
  );
}
