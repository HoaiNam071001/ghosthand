// Các mục của inspector khi soạn flow (bước 20):
// - Cổng ra: mỗi cổng một ô chọn node đích – cách nối không cần kéo, dùng được bằng bàn phím
// - Khi thất bại: thử lại N lần, nghỉ giữa các lần (node hành động)
// - Output: các giá trị node trả về, chèn vào ô chữ của node sau bằng {{n2.output.x}}
// - Lần chạy gần nhất: status, lỗi, log của node (StepResult)
import Select from '../Select';
import { useState } from 'react';
import NumInput, { fieldBox } from '../NumInput';
import { FlowEdgeView, FlowNodeView, PortKind, RunRow } from './model';
import OutputTable from './OutputTable';
import { outputRows } from '../../flow/outputRows';

const dot: Record<PortKind, string> = { ok: 'bg-ok', fail: 'bg-danger', neutral: 'bg-muted' };
// Mỗi panel chỉ là nội dung – tên khối + tóm tắt nằm ở Section (stepform/InspectorParts) bên ngoài.
const body = 'flex flex-col gap-2.5';
// Hàng nhãn trái + ô phải – như Field (stepform/shared, design v3)
const row = 'grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2.5';

export function PortsPanel({ node, nodes, edges, onConnect, onDisconnect, onJump }: {
  node: FlowNodeView; nodes: FlowNodeView[]; edges: FlowEdgeView[];
  onConnect: (port: string, to: string) => void; onDisconnect: (port: string) => void; onJump: (id: string) => void;
}) {
  if (!node.ports.length) {
    return <span className="text-[13px] text-muted">Node Kết thúc không có cổng ra – kịch bản dừng ở đây.</span>;
  }
  const others = nodes.filter((n) => n.id !== node.id);
  return (
    <div className={body}>
      {node.ports.map((p) => {
        const to = edges.find((e) => e.from === node.id && e.port === p.id)?.to ?? '';
        return (
          // hàng: chấm + tên cổng | ô chọn node đích (mã + tên) | → chọn node đích
          <div key={p.id} className={row}>
            <span className={`flex min-w-0 items-center gap-2 ${p.kind === 'fail' ? 'text-danger-text' : 'text-muted'}`}>
              <span className={`h-2 w-2 flex-none rounded-full ${dot[p.kind]}`} /><span className="truncate" title={p.label}>{p.label}</span>
            </span>
            <span className="flex min-w-0 gap-1">
              <div className="min-w-0 flex-1">
                <Select value={to} onChange={(v) => (v ? onConnect(p.id, v) : onDisconnect(p.id))} aria-label={`Node đích của cổng ${p.label}`}
                  className={`${fieldBox} text-[13px] ${to ? 'text-ink' : 'text-muted'}`}
                  options={[{ value: '', label: p.kind === 'fail' ? '— dừng (lỗi)' : '— kết thúc' }, ...others.map((n) => ({ value: n.id, label: `${n.ref} · ${n.title}` }))]} />
              </div>
              <button disabled={!to} onClick={() => onJump(to)} title="Chọn node đích" aria-label="Chọn node đích"
                className="grid h-[34px] w-7 flex-none place-items-center rounded-control text-muted enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-30">→</button>
            </span>
          </div>
        );
      })}
      <span className="text-xs text-muted">Hoặc kéo từ chấm cổng trên thẻ sang node khác.</span>
    </div>
  );
}

export type Retry = { count: number; delayMs: number };
export function RetryPanel({ value, onChange }: { value: Retry; onChange: (v: Retry) => void }) {
  return (
    <div className={body}>
      <label className={row}><span className="text-muted">Thử lại</span><NumInput value={value.count} unit="lần" stepper onChange={(count) => onChange({ ...value, count })} /></label>
      <label className={row}><span className="text-muted">Nghỉ giữa các lần</span><NumInput value={value.delayMs} unit="ms" onChange={(delayMs) => onChange({ ...value, delayMs })} /></label>
      <span className="text-xs text-muted">Thử hết vẫn không được thì đi ra cổng <span className="text-danger-text">Thất bại</span>.</span>
    </div>
  );
}

import type { OutputField } from '../../flow/view';
export type { OutputField };
export function OutputsPanel({ refName, fields }: { refName: string; fields: OutputField[] }) {
  const [copied, setCopied] = useState('');
  const copy = (k: string) => {
    const t = `{{${refName}.output.${k}}}`;
    navigator.clipboard?.writeText(t).catch(() => {});
    setCopied(k);
    setTimeout(() => setCopied(''), 1200);
  };
  return (
    <div className={body}>
      <span className="text-xs text-muted">Bấm để chép biến – rê để xem ý nghĩa</span>
      {/* chip var-token (design v3): mô tả trong tooltip, vừa chép thì chip hiện ✓ */}
      <div className="flex flex-wrap gap-1.5">
        {fields.map((f) => (
          <button key={f.key} onClick={() => copy(f.key)} title={f.desc}
            className={`var-token inline-flex items-center gap-1 hover:ring-1 hover:ring-accent/40 ${copied === f.key ? 'ring-1 ring-accent' : ''}`}>
            {`${refName}.output.${f.key}`}{copied === f.key && <span aria-label="đã chép">✓</span>}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted">Còn có <span className="font-mono">{`{{${refName}.status}}`}</span>, <span className="font-mono">{`{{${refName}.error.message}}`}</span>.</span>
    </div>
  );
}

export function LastRunPanel({ row, refName, fields }: { row: RunRow; refName: string; fields?: OutputField[] }) {
  return (
    <div className={body}>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
        <span>{row.at}</span>
        {row.ms !== undefined && <span>{fmtMs(row.ms)}</span>}
        {row.attempts && row.attempts > 1 && <span>{row.attempts} lần thử</span>}
        {row.port && <span>→ {row.port}{row.next ? ` · ${row.next}` : ''}</span>}
      </div>
      {row.error && (
        <div className="rounded-control bg-danger-soft px-2.5 py-2 text-[13px] text-danger-text">
          <span className="font-mono text-xs">{row.error.code}</span> · {row.error.message}
        </div>
      )}
      {row.output && <OutputTable rows={outputRows(refName, row.output, fields)} output={row.output} label={refName} />}
      {!!row.logs?.length && <LogLines logs={row.logs} />}
    </div>
  );
}

export function LogLines({ logs }: { logs: NonNullable<RunRow['logs']> }) {
  return (
    <ol className="flex flex-col gap-0.5 font-mono text-xs">
      {logs.map((l, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-muted">{l.t}</span>
          <span className={l.level === 'error' ? 'text-danger-text' : l.level === 'warn' ? 'text-warn' : 'text-ink'}>{l.msg}</span>
        </li>
      ))}
    </ol>
  );
}

const STATUS: Record<RunRow['status'], [string, string]> = {
  success: ['Thành công', 'bg-soft text-ok'],
  fail: ['Thất bại', 'bg-danger-soft text-danger-text'],
  skipped: ['Bỏ qua', 'bg-soft text-muted'],
  cancelled: ['Đã dừng', 'bg-soft text-muted'],
  running: ['Đang chạy', 'bg-accent-soft text-accent-text'],
};
export const StatusChip = ({ status }: { status: RunRow['status'] }) => (
  <span className={`rounded-full px-2 py-px text-[11px] font-semibold whitespace-nowrap ${STATUS[status][1]}`}>{STATUS[status][0]}</span>
);

export const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${ms} ms`);
