// Thẻ một lần chạy node trên cây lần chạy (bước 60 V7): đầu thẻ màu nhóm (icon, tên, thời gian, mã, trạng thái), dòng phụ
// (cổng → node kế / tóm tắt lượt), pill giá trị VÀO trên thẻ / RA dưới thẻ (kiểu Luôn hiện). Chỉ hiển thị.
import { StepIcon } from '../icons';
import { fmtMs } from '../flow/PortField';
import { TREE } from '../../flow/runTree';
import type { CardText, Pill } from '../../flow/runTreeView';
import type { NodeCategory } from '../../flow/category';
import type { StepType } from '../../types';

export type CardProps = {
  k: string; x: number; y: number; w: number;
  icon: StepType; cat: NodeCategory; ref_: string; text: CardText; status: 'ok' | 'fail' | 'warn';
  ins: Pill[]; outs: Pill[]; pills: boolean;
  sel: boolean; lin: boolean; toggle?: { open: boolean; count: number; onToggle: () => void };
  onClick?: () => void; onEnter: () => void; onLeave: () => void;
};

export default function RunTreeCard(p: CardProps) {
  const ring = p.sel ? 'ring-selected z-[4]' : p.lin ? 'border border-data' : p.status === 'fail' ? 'border border-danger' : 'border border-line';
  return (
    <div role="button" tabIndex={0} aria-label={p.text.title} data-card={p.k}
      onClick={p.onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), p.onClick?.())}
      onMouseEnter={p.onEnter} onMouseLeave={p.onLeave}
      style={{ left: p.x, top: p.y, width: p.w, height: TREE.CH }}
      className={`cat-${p.cat} absolute z-[2] select-none rounded-[10px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/.05)] hover:z-[5] ${p.onClick ? 'cursor-pointer' : ''} ${ring}`}>
      {p.pills && p.ins.length > 0 && (
        <div className="pointer-events-none absolute bottom-[calc(100%+5px)] left-7 right-[-40px] flex flex-wrap-reverse gap-1">
          {p.ins.map((x) => <PillView key={x.id} pill={x} side="in" k={`${p.k}:in:${x.id}`} />)}
        </div>
      )}
      <div className="flex h-7 items-center gap-1.5 rounded-t-[9px] bg-cat-soft px-2 text-xs">
        <span className="grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px] bg-cat-tile text-cat"><StepIcon type={p.icon} className="h-[11px] w-[11px]" /></span>
        <span className="min-w-0 flex-1 truncate font-semibold">{p.text.title}</span>
        {p.text.ms !== undefined && <span className="font-mono text-[10.5px] text-muted">{fmtMs(p.text.ms)}</span>}
        <span className="font-mono text-[10.5px] text-muted">{p.ref_}</span>
        <Status s={p.status} />
      </div>
      <div className="flex h-5 items-center gap-1.5 overflow-hidden whitespace-nowrap px-2.5 text-[11px] text-muted">
        <span className={`min-w-0 truncate ${p.text.subFail ? 'text-danger-text' : ''}`}>{p.text.sub}</span>
        {p.toggle && (
          <button onClick={(e) => { e.stopPropagation(); p.toggle!.onToggle(); }} aria-expanded={p.toggle.open} title={p.toggle.open ? 'Thu nhánh' : 'Mở nhánh'}
            className="ml-auto flex-none rounded-[5px] bg-accent-soft px-1.5 text-[10.5px] leading-4 text-accent-text">{p.toggle.open ? '▾' : '▸'} {p.toggle.count} node</button>
        )}
      </div>
      {p.pills && p.outs.length > 0 && (
        <div className="pointer-events-none absolute left-7 right-[-40px] top-[calc(100%+5px)] flex flex-wrap gap-1">
          {p.outs.map((x) => <PillView key={x.id} pill={x} side="out" k={`${p.k}:out:${x.id}`} />)}
        </div>
      )}
    </div>
  );
}

function PillView({ pill: x, side, k }: { pill: Pill; side: 'in' | 'out'; k: string }) {
  return (
    <span data-pill={k} title={`${x.label}: ${x.value}`}
      className="pointer-events-auto inline-flex h-5 max-w-[190px] items-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong bg-surface px-1.5 text-[10.5px]">
      {side === 'in' && <span className="h-[7px] w-[7px] flex-none rounded-[2px] border-[1.5px] border-data" />}
      <span className="text-muted">{x.label}</span>
      <span className={`truncate font-mono ${side === 'in' ? 'text-accent-text' : 'text-ok'}`}>{x.value}</span>
      {side === 'out' && <span className="h-[7px] w-[7px] flex-none rounded-[2px] border-[1.5px] border-data" />}
    </span>
  );
}

function Status({ s }: { s: 'ok' | 'fail' | 'warn' }) {
  const cls = s === 'ok' ? 'bg-ok/15 text-ok' : 'bg-danger-soft text-danger-text';
  return (
    <span className={`grid h-3.5 w-3.5 flex-none place-items-center rounded-full text-[9px] font-bold ${cls}`} aria-label={s === 'ok' ? 'Thành công' : s === 'fail' ? 'Thất bại' : 'Có lỗi bên trong'}>
      {s === 'ok' ? '✓' : s === 'fail' ? '✕' : '!'}
    </span>
  );
}
