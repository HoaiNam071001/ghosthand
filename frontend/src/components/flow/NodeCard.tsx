// Thẻ node trên canvas flow (design v3, bước 38): đầu thẻ nền màu nhóm (ô icon, tên, mã n2), dòng chi tiết mono.
// Node chỉ có Thành công / Thất bại: 2 chấm trên mép phải (ok ngang đầu thẻ, danger sát đáy), không dòng nhãn;
// node nhiều lối ra: mỗi cổng một dòng nhãn + chấm. Phần không còn chỗ (cổng chưa nối, chip phụ) nằm trong tooltip.
// Cỡ cố định theo model.ts để xếp tự động không cần đo DOM.
import { Handle, Node, NodeProps, Position } from '@xyflow/react';
import { StepIcon } from '../icons';
import { FlowNodeView, inputY, NODE_DETAIL, NODE_HEAD, NODE_W, PORT_ROW, portRows, PORTS_PAD, portY, PortView } from './model';

export type CardData = { view: FlowNodeView; start: boolean; linked: string[] };
export type CardNode = Node<CardData, 'card'>;

export default function NodeCard({ data, selected }: NodeProps<CardNode>) {
  const { view: v, start, linked } = data;
  const off = v.enabled === false;
  const ids = v.ports.map((p) => p.id);
  const rows = portRows(ids);
  const outline = v.run === 'running' ? 'outline-2 outline-offset-2 outline-accent' : v.run === 'fail' ? 'outline-2 outline-offset-2 outline-danger' : '';
  const tip = [v.warn, off && 'Đang tắt – chạy tới thì bỏ qua', v.chips?.join(' · ')].filter(Boolean).join('\n') || undefined;
  return (
    <div style={{ width: NODE_W }} title={tip}
      className={`cat-${v.cat} relative rounded-[10px] ${selected ? 'ring-selected' : 'border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/.05)]'} ${outline} ${v.run === 'skipped' ? 'opacity-60' : ''}`}>
      {start && (
        <span className="absolute -top-[23px] left-0 flex h-[19px] items-center gap-1 rounded-full bg-accent-soft px-2 text-[11px] font-semibold text-accent-text">
          <svg viewBox="0 0 24 24" className="h-2 w-2" fill="currentColor" aria-hidden><path d="M6 4l14 8-14 8z" /></svg>Bắt đầu
        </span>
      )}
      <Badge v={v} />
      <Handle type="target" position={Position.Left} style={{ top: inputY }} className="flow-handle flow-handle-in" />

      <div style={{ height: NODE_HEAD }} className={`flex items-center gap-[7px] rounded-t-[9px] bg-cat-soft px-2 ${off ? 'opacity-50' : ''}`}>
        <span className="grid h-5 w-5 flex-none place-items-center rounded-[6px] bg-cat-tile text-cat"><StepIcon type={v.icon} className="h-3 w-3" /></span>
        {v.pinned && <svg viewBox="0 0 24 24" className="h-3 w-3 flex-none text-warn" fill="currentColor" aria-label="Output đã ghim"><title>Output đã ghim – node không chạy, dùng kết quả đã lưu</title><path d="M9 3h6l-1 6 3 3v2h-4v6l-1 1-1-1v-6H7v-2l3-3z" /></svg>}
        {v.breakpoint && <span className="h-2 w-2 flex-none rounded-full bg-danger" title="Điểm dừng (debug)" />}
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{v.title}</span>
        <span className="flex-none font-mono text-[10.5px] text-muted">{off ? 'Tắt' : v.ref}</span>
      </div>
      <div style={{ height: NODE_DETAIL }} className={`truncate px-2.5 pt-[5px] font-mono text-[11px] text-muted ${off ? 'opacity-50' : ''}`}>{v.detail}</div>

      {rows && (
        <div style={{ paddingBottom: PORTS_PAD }}>
          {v.ports.map((p) => (
            <div key={p.id} style={{ height: PORT_ROW }} className={`flex items-center justify-end pr-3 text-[11px] ${p.kind === 'fail' ? 'text-danger-text' : 'text-muted'}`}>{p.label}</div>
          ))}
        </div>
      )}
      {v.ports.map((p, i) => (
        <Handle key={p.id} type="source" id={p.id} position={Position.Right} style={{ top: portY(ids, i) }}
          title={portTip(p, !linked.includes(p.id))} className={`flow-handle flow-port-${p.kind}`} />
      ))}
    </div>
  );
}

// Tooltip chấm cổng ra: tên cổng + đi đâu khi chưa nối.
function portTip(p: PortView, free: boolean): string {
  if (!free) return p.label;
  return `${p.label} – chưa nối: ${p.kind === 'fail' ? 'lỗi ở đây thì dừng kịch bản' : 'đi ra cổng này thì kết thúc kịch bản'}`;
}

// Huy hiệu góc phải trên: trạng thái chạy (đang chạy / xong / lỗi + số lần đi qua), hoặc cảnh báo khi đang soạn.
function Badge({ v }: { v: FlowNodeView }) {
  const visits = v.visits && v.visits > 1 ? <span className="font-mono text-[11px]">×{v.visits}</span> : null;
  const box = 'absolute -top-2.5 -right-2.5 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border bg-surface px-1';
  if (v.run === 'running') {
    return <span className={`${box} border-accent text-accent-text`} title="Đang chạy"><span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />{visits}</span>;
  }
  if (v.run === 'ok') return <span className={`${box} border-ok text-ok`} title="Thành công"><Check />{visits}</span>;
  if (v.run === 'fail') return <span className={`${box} border-danger text-danger-text`} title="Thất bại"><Cross />{visits}</span>;
  if (v.run === 'skipped') return <span className={`${box} border-line text-muted`} title="Bỏ qua (node tắt)"><span className="font-mono text-[11px]">–</span></span>;
  if (v.warn) return <span className={`${box} border-warn font-mono text-[11px] font-bold text-warn`} title={v.warn}>!</span>;
  return null;
}

const Check = () => <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
const Cross = () => <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>;
