// Chữ trên overlay (chỉ hiển thị): dòng gợi ý giữa trên, crosshair + toạ độ chuột, ô thông tin góc trên trái.
import { ReactNode } from 'react';
import { main } from '../../../wailsjs/go/models';
import type { Mapping } from '../../coordMap';
import { Point, Rect, Step } from '../../types';
import type { BarSide } from '../../overlay/toolbarLayout';

// Gợi ý gọn một dòng giữa phía trên – cũng là tab mở thanh công cụ (rê vào / đưa chuột sát mép trên).
export function HintPill({ side, barOpen, onEnter, onLeave, icon, title, hint, extra, notice }: {
  side: BarSide; barOpen: boolean; onEnter: () => void; onLeave: () => void; icon: ReactNode; title: string; hint: string; extra?: string; notice?: string;
}) {
  return (
    <div data-ui onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ top: barOpen && side === 'top' ? 76 : 8 }}
      className="absolute left-1/2 flex h-8 max-w-[min(760px,calc(100vw-48px))] -translate-x-1/2 cursor-default items-center gap-2 whitespace-nowrap rounded-full border border-hud-line bg-hud/95 pr-3.5 pl-1.5 text-[12px] text-hud-text shadow-[0_6px_18px_rgb(0_0_0/.3)] transition-[top] duration-150">
      <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-accent-soft text-accent-text">{icon}</span>
      <b className="font-semibold text-white">{title}</b>
      <span className="min-w-0 truncate text-hud-text/75">{hint}</span>
      {extra && <span className="truncate font-mono text-[#FF8CC6]">{extra}</span>}
      {notice && <span className="truncate text-ok">· {notice}</span>}
      {!barOpen && side === 'top' && <svg width="10" height="10" viewBox="0 0 10 10" className="flex-none text-hud-text/50" aria-hidden><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>}
    </div>
  );
}

// Crosshair + toạ độ màn hình thật theo chuột.
export function Crosshair({ at, screen, hidden }: { at: Point; screen: Point; hidden: boolean }) {
  return (
    <div className={`pointer-events-none absolute ${hidden ? 'hidden' : ''}`} style={{ left: at.x, top: at.y }}>
      <div className="absolute -top-10 h-20 w-px bg-white" />
      <div className="absolute -left-10 h-px w-20 bg-white" />
      <span className="absolute left-3.5 top-3 whitespace-nowrap rounded bg-hud px-2 py-1 font-mono text-[13px] text-hud-text">X {screen.x}  Y {screen.y}</span>
    </div>
  );
}

// Thông tin toạ độ góc trên trái: vùng, màn hình, điểm của node đang xem riêng, độ lệch đã đo (measure = null: ngoài Wails).
export function CoordInfo({ region, displays, current, focusStep, focusEnds, measure }: {
  region: Rect | null; displays: main.DisplayInfo[]; current?: main.DisplayInfo; focusStep: Step | null;
  focusEnds?: { start: Point | null; end: Point | null }; measure: { map: Mapping; measured: boolean } | null;
}) {
  const pts = !focusStep ? [] : focusStep.type === 'drag' ? [['A', focusEnds?.start], ['B', focusEnds?.end]] as const : [['Điểm', focusEnds?.start]] as const;
  return (
    <div data-ui className="absolute top-2 left-2 flex max-w-[240px] flex-col rounded-md border border-hud-line bg-hud/85 px-2 py-1 font-mono text-[11px] leading-[16px] text-hud-text/80">
      <span>{region ? `Vùng X ${region.x} Y ${region.y} · ${region.w} × ${region.h}` : 'Vùng: toàn màn hình'}</span>
      {displays.length > 1 && current && <span>Màn {current.index + 1}{current.main ? ' (chính)' : ''} / {displays.length}</span>}
      {pts.map(([k, p]) => <span key={k}>{k}: {p ? `X ${p.x} Y ${p.y}` : '—'}</span>)}
      {measure && (
        <span className="text-hud-text/60">
          {measure.measured
            ? `Đo toạ độ: tỷ lệ ${measure.map.kx.toFixed(2)}${Math.abs(measure.map.kx - measure.map.ky) > 0.01 ? `/${measure.map.ky.toFixed(2)}` : ''} · lệch X ${Math.round(measure.map.bx)} Y ${Math.round(measure.map.by)}`
            : 'Đang đo toạ độ – rê chuột rồi dừng lại'}
        </span>
      )}
    </div>
  );
}
