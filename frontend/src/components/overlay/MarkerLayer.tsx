// Marker + đường nối trên overlay (chỉ hiển thị): đường neo, mũi tên cuộn, đường giữa các điểm, ô ngẫu nhiên, marker.
import { useT } from '../../i18n';
import { MouseEvent } from 'react';
import { AnchorLine, Marker, ScrollArrow } from '../../overlay/geometry';
import { Point } from '../../types';

const dot = 'grid h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-accent text-[13px] font-bold text-on-accent shadow-[0_2px_8px_rgb(0_0_0/.35)]';

// focus: id node đang xem riêng – phần của node khác mờ đi. dragA: điểm A đã đặt (toạ độ cửa sổ), chờ B.
export function OverlayLines({ anchorLines, scrollArrows, markers, dragA, cursor, focus, paths = [] }: {
  anchorLines: AnchorLine[]; scrollArrows: ScrollArrow[]; markers: Marker[]; dragA: Point | null; cursor: Point; focus: string | null;
  paths?: { id: string; pts: Point[] }[]; // nét node Vẽ đường
}) {
  const t = useT();
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" className="fill-accent" />
        </marker>
      </defs>
      {paths.map((p) => (
        <polyline key={p.id} points={p.pts.map((q) => `${q.x},${q.y}`).join(' ')} fill="none" className="stroke-accent" strokeWidth={3}
          strokeLinejoin="round" strokeLinecap="round" opacity={focus && p.id !== focus ? 0.2 : 0.85} />
      ))}
      {anchorLines.map((l) => (
        <g key={l.key}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#fff" strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />
          <circle cx={l.x1} cy={l.y1} r={3} fill="#fff" opacity={0.8} />
          <text x={(l.x1 + l.x2) / 2} y={(l.y1 + l.y2) / 2} dx={l.y1 === l.y2 ? 0 : 6} dy={l.y1 === l.y2 ? -6 : 4}
            textAnchor={l.y1 === l.y2 ? 'middle' : 'start'} className="fill-white font-mono text-[11px]" opacity={0.85}>{l.text}</text>
        </g>
      ))}
      {scrollArrows.map((r) => {
        const nearRight = r.tip.x > window.innerWidth - 200;
        return (
          <g key={r.id} opacity={focus && r.id !== focus ? 0.2 : 1}>
            <line x1={r.a.x} y1={r.a.y} x2={r.tip.x} y2={r.tip.y} className="stroke-accent" strokeWidth={4} strokeDasharray={r.cut ? '10 6' : undefined} markerEnd="url(#ah)" />
            <text x={r.tip.x} y={r.tip.y} dx={nearRight ? -10 : 10} dy={-8} textAnchor={nearRight ? 'end' : 'start'}
              className="fill-white font-mono text-xs font-semibold" stroke="rgb(0 0 0 / .65)" strokeWidth={3} paintOrder="stroke">
              {r.text}{r.cut ? ` – ${t('ml.cut')}` : ''}
            </text>
          </g>
        );
      })}
      {dragA && (
        <line x1={dragA.x} y1={dragA.y} x2={cursor.x} y2={cursor.y} className="stroke-accent" strokeWidth={3} strokeDasharray="8 5" markerEnd="url(#ah)" />
      )}
      {markers.slice(1).map((m, i) => {
        const prev = markers[i];
        const isDrag = prev.drag && m.drag && prev.label.endsWith('A');
        // xem riêng: chỉ đường A → B của bước đang xem giữ rõ
        const dim = focus && !(prev.id === focus && m.id === focus);
        return isDrag
          ? <line key={i} x1={prev.at.x} y1={prev.at.y} x2={m.at.x} y2={m.at.y} className="stroke-accent" strokeWidth={3} markerEnd="url(#ah)" opacity={dim ? 0.2 : 1} />
          : <line key={i} x1={prev.at.x} y1={prev.at.y} x2={m.at.x} y2={m.at.y} stroke="#fff" strokeWidth={2} strokeDasharray="6 6" opacity={dim ? 0.15 : 0.8} />;
      })}
    </svg>
  );
}

// Ô ngẫu nhiên vị trí (± px, bước 19) quanh marker. scale: px màn hình → px cửa sổ (1 / kx, 1 / ky).
export function JitterBoxes({ markers, scale, focus }: { markers: Marker[]; scale: { x: number; y: number }; focus: string | null }) {
  return markers.filter((m) => m.jitter > 0 && !m.ghost).map((m) => (
    <span key={`j${m.label}`} aria-hidden
      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 border border-dashed ${focus && m.id !== focus ? 'opacity-20' : ''} border-accent bg-accent/15`}
      style={{ left: m.at.x, top: m.at.y, width: (2 * m.jitter + 1) * scale.x, height: (2 * m.jitter + 1) * scale.y }} />
  ));
}

export function MarkerDots({ markers, selectMode, multi, preview, focus, selected, grabbing, dragA, onDown }: {
  markers: Marker[]; selectMode: boolean; multi: string[]; preview: boolean; focus: string | null;
  selected: string | null; grabbing: boolean; dragA: Point | null; onDown: (e: MouseEvent, id: string, index: number) => void;
}) {
  const t = useT();
  return (
    <>
      {markers.filter((m) => !m.ghost).map((m) => (
        <span key={m.label} style={{ left: m.at.x, top: m.at.y }}
          title={selectMode ? t('ml.selTip') : t('ml.dragTip')}
          onMouseDown={(e) => onDown(e, m.id, m.index)}
          className={`${selectMode ? (multi.includes(m.key) ? 'z-10 outline-2 outline-offset-2 outline-white' : 'opacity-60') : ''} ${preview ? 'pointer-events-none opacity-70' : ''} ${focus && m.id !== focus ? 'pointer-events-none opacity-25 grayscale' : ''} ${focus === m.id ? 'z-10 scale-110' : ''} absolute ${dot} ${grabbing ? 'cursor-grabbing' : 'cursor-grab'} ${m.id === selected ? 'outline-[3px] outline-offset-2 outline-white outline-dashed' : ''}`}>
          {m.label}
        </span>
      ))}
      {dragA && <span style={{ left: dragA.x, top: dragA.y }} className={`pointer-events-none absolute ${dot}`}>A</span>}
    </>
  );
}
