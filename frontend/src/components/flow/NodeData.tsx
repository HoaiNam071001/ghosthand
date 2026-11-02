// Dữ liệu trên thẻ node (bước 60): khối VÀO / RA của thẻ Đầy đủ và cổng toả ra quanh thẻ Gọn khi rê chuột / đang kéo nối.
// Mỗi hàng có chấm vuông nối dữ liệu (Handle React Flow: nguồn "o:<khoá>", đích "i:<ô>") – chỉ hiển thị.
import { Handle, Position } from '@xyflow/react';
import type { DataPins, DataPinView } from '../../flow/dataView';
import { IO_HEAD, IO_PAD, PIN_ROW } from './model';

export const outHandle = (key: string) => `o:${key}`;
export const inHandle = (slot: string) => `i:${slot}`;

// Khối VÀO / RA (thẻ Đầy đủ)
export function DataBlock({ pins }: { pins: DataPins }) {
  return (
    <>
      {pins.ins.length > 0 && <Section title="VÀO" align="left">{pins.ins.map((p) => <PinRow key={p.id} pin={p} side="in" />)}</Section>}
      {pins.outs.length > 0 && <Section title="RA" align="right">{pins.outs.map((p) => <PinRow key={p.id} pin={p} side="out" />)}</Section>}
    </>
  );
}

function Section({ title, align, children }: { title: string; align: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <div className="border-t border-line" style={{ paddingBottom: IO_PAD }}>
      <div style={{ height: IO_HEAD }} className={`px-2.5 pt-1 text-[9.5px] font-bold tracking-[.08em] text-faint ${align === 'right' ? 'text-right' : ''}`}>{title}</div>
      {children}
    </div>
  );
}

function PinRow({ pin: p, side }: { pin: DataPinView; side: 'in' | 'out' }) {
  const isIn = side === 'in';
  const tone = p.ran ? 'text-ok' : isIn && p.linked ? 'text-accent-text' : 'text-muted';
  return (
    <div style={{ height: PIN_ROW }} title={p.tip ? `${p.label}: ${p.tip}` : p.label}
      className={`relative flex items-center gap-1.5 px-2.5 text-[11px] hover:bg-accent-soft ${isIn ? '' : 'flex-row-reverse'}`}>
      <span className="flex-none whitespace-nowrap text-muted">{p.label === p.id || isIn ? p.label : p.id}</span>
      <span className={`min-w-0 flex-1 truncate font-mono text-[10.5px] ${isIn ? '' : 'text-right'} ${tone}`}>{p.value}</span>
      <Handle type={isIn ? 'target' : 'source'} id={isIn ? inHandle(p.id) : outHandle(p.id)} position={isIn ? Position.Left : Position.Right}
        style={{ top: PIN_ROW / 2 }} className={`flow-pin ${isIn && !p.linked ? 'flow-pin-free' : ''}`} />
    </div>
  );
}

// Cổng toả ra quanh thẻ Gọn: VÀO bên trái, RA bên phải (side 'in' = chỉ VÀO, lúc đang kéo nối từ node khác tới).
export function DataFan({ pins, side, height, block }: { pins: DataPins; side: 'both' | 'in'; height: number; block?: string }) {
  if (block) {
    return <div role="note" className="nodrag absolute inset-x-0 top-[calc(100%+6px)] rounded-md bg-danger-soft px-2 py-1 text-center text-[11px] text-danger-text">{block}</div>;
  }
  return (
    <>
      {pins.ins.length > 0 && (
        <div className="flow-fan flow-fan-in nodrag" style={{ top: height / 2 }}>
          <span className="px-1 text-[9.5px] font-bold tracking-[.08em] text-faint">VÀO</span>
          {pins.ins.map((p, i) => <FanChip key={p.id} pin={p} side="in" i={i} />)}
        </div>
      )}
      {side === 'both' && pins.outs.length > 0 && (
        <div className="flow-fan flow-fan-out nodrag" style={{ top: height / 2 }}>
          <span className="px-1 text-[9.5px] font-bold tracking-[.08em] text-faint">RA · kéo để nối</span>
          {pins.outs.map((p, i) => <FanChip key={p.id} pin={p} side="out" i={i} />)}
        </div>
      )}
    </>
  );
}

function FanChip({ pin: p, side, i }: { pin: DataPinView; side: 'in' | 'out'; i: number }) {
  const isIn = side === 'in';
  return (
    <div style={{ '--i': i } as React.CSSProperties} title={p.tip ? `${p.label}: ${p.tip}` : p.label}
      className={`flow-fan-chip ${isIn ? 'flex-row-reverse' : ''}`}>
      <Handle type={isIn ? 'target' : 'source'} id={isIn ? inHandle(p.id) : outHandle(p.id)} position={isIn ? Position.Right : Position.Left}
        className={`flow-pin !static !transform-none ${isIn && !p.linked ? 'flow-pin-free' : ''}`} />
      <span className="text-muted">{p.label}</span>
      <span className={`max-w-[120px] truncate font-mono text-[10.5px] ${p.ran ? 'text-ok' : isIn && !p.linked ? 'text-faint' : 'text-accent-text'}`}>{p.value}</span>
    </div>
  );
}
