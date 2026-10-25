// Bảng Nhật ký dưới canvas (bước 20 F5): mỗi dòng một lần chạy node (StepResult). Bấm dòng → chọn node trên canvas
// và mở chi tiết (output / lỗi / log / ảnh lúc lỗi). Thu gọn được còn một dòng tiêu đề; nhiều vòng thì có dòng chia vòng.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { StepIcon } from '../icons';
import { FlowNodeView, RunRow } from './model';
import { fmtMs, LogLines, StatusChip } from './PortField';
import { openSettings } from '../../settingsNav';
import { outputBlocks } from '../../flow/runOutputs';
import RunOutputs from './RunOutputs';

export type RunTone = 'ok' | 'fail' | 'running' | 'muted';
const TONE: Record<RunTone, string> = { ok: 'text-ok', fail: 'text-danger-text', running: 'text-accent-text', muted: 'text-muted' };

export default function RunLog({ title, summary, tone, rows, nodes, selected, onSelect, onClose, loadShot, fill }: {
  title: string; summary: string; tone: RunTone;
  rows: RunRow[]; nodes: FlowNodeView[]; selected: string | null; onSelect: (id: string) => void;
  onClose?: () => void;
  loadShot?: (shot: string) => Promise<string>; // ảnh lúc lỗi (lịch sử chạy) → data URL
  fill?: boolean; // cao hết khung cha (hộp thoại Lịch sử chạy) thay vì 220 px dưới canvas
}) {
  const [open, setOpen] = useState(true);
  const [row, setRow] = useState<number | null>(null);
  const [view, setView] = useState<'log' | 'outputs'>('log');
  const blocks = useMemo(() => outputBlocks(rows, nodes), [rows, nodes]);
  const list = useRef<HTMLOListElement>(null);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const loops = new Set(rows.map((r) => r.loop)).size > 1;

  // Dòng mới nhất luôn hiện (đang chạy / vừa mở) – trừ khi đang xem chi tiết một dòng
  useEffect(() => {
    if (row === null && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [rows.length, open, row]);

  return (
    <section aria-label="Nhật ký chạy" className="flex flex-none flex-col border-t border-line bg-surface" style={{ height: fill ? '100%' : open ? 220 : 'auto' }}>
      <div className="flex h-9 flex-none items-center">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex h-full min-w-0 flex-1 items-center gap-3 px-4 text-left hover:bg-hover">
          <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 flex-none text-muted transition-transform ${open ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
          <span className="font-semibold">Nhật ký</span>
          <span className="whitespace-nowrap text-muted">{title}</span>
          <span className={`ml-auto truncate text-xs ${TONE[tone]}`} title={summary}>{summary}</span>
        </button>
        <div role="tablist" aria-label="Kiểu xem nhật ký" className="mr-2 flex flex-none rounded-md bg-soft p-0.5 text-xs">
          {([['log', 'Từng bước'], ['outputs', `Tất cả output${blocks.length ? ` (${blocks.length})` : ''}`]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => { setView(id); setOpen(true); }}
              className={`h-6 whitespace-nowrap rounded px-2.5 ${view === id ? 'bg-raised font-semibold shadow-[var(--c-raise)]' : 'text-muted hover:text-ink'}`}>{label}</button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Đóng nhật ký" title="Đóng nhật ký (bỏ tô đường đã đi trên canvas)"
            className="grid h-9 w-9 flex-none place-items-center text-muted hover:bg-hover hover:text-ink">✕</button>
        )}
      </div>
      {open && view === 'outputs' && <RunOutputs blocks={blocks} loops={loops} />}
      {open && view === 'log' && (
        <div className="flex min-h-0 flex-1">
          <ol ref={list} className="min-w-0 flex-1 overflow-y-auto border-t border-line">
            {rows.length === 0 && <li className="px-4 py-2 text-[13px] text-muted">Chưa có node nào chạy xong.</li>}
            {rows.map((r, i) => {
              const n = byId.get(r.nodeId);
              const on = row === i;
              return (
                <Fragment key={i}>
                  {loops && r.loop !== rows[i - 1]?.loop && (
                    <li className="bg-soft px-4 py-0.5 font-mono text-[11px] text-muted">vòng {r.loop}</li>
                  )}
                  <li>
                    <button onClick={() => { setRow(on ? null : i); onSelect(r.nodeId); }}
                      className={`grid w-full grid-cols-[64px_34px_minmax(0,1fr)_88px_64px_minmax(0,160px)] items-center gap-2 px-4 py-1 text-left text-[13px] ${on ? 'bg-accent-soft' : selected === r.nodeId ? 'bg-hover' : 'hover:bg-hover'}`}>
                      <span className="font-mono text-xs text-muted">{r.at}</span>
                      <span className="font-mono text-xs text-muted">{n?.ref ?? '?'}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        {n && <StepIcon type={n.icon} className="h-3.5 w-3.5 flex-none text-muted" />}
                        <span className="truncate">{n?.title ?? 'node đã xoá'}</span>
                        {r.attempts && r.attempts > 1 && <span className="font-mono text-[11px] text-muted">{r.attempts} lần thử</span>}
                        {r.shot && <span className="text-[11px] text-muted" title="Có ảnh màn hình lúc lỗi">· ảnh</span>}
                      </span>
                      <StatusChip status={r.status} />
                      <span className="font-mono text-xs text-muted">{r.ms !== undefined ? fmtMs(r.ms) : ''}</span>
                      <span className="truncate font-mono text-xs text-muted">{r.port ? `→ ${r.port}${r.next ? ` · ${r.next}` : ''}` : ''}</span>
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ol>
          {row !== null && rows[row] && <Detail key={row} r={rows[row]} loadShot={loadShot} />}
        </div>
      )}
    </section>
  );
}

function Detail({ r, loadShot }: { r: RunRow; loadShot?: (shot: string) => Promise<string> }) {
  const [shot, setShot] = useState('');
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (r.shot && loadShot) loadShot(r.shot).then(setShot);
  }, [r.shot, loadShot]);
  return (
    <div className="flex w-[340px] flex-none flex-col gap-2 overflow-y-auto border-t border-l border-line p-3 max-[1100px]:w-[280px]">
      {r.error && <div className="rounded-control bg-danger-soft px-2.5 py-2 text-[13px] text-danger-text"><span className="font-mono text-xs">{r.error.code}</span> · {r.error.message}
        <PermLink detail={r.error.detail} /></div>}
      {shot && (
        <button onClick={() => setBig(true)} title="Màn hình lúc node thất bại – bấm để phóng to" className="overflow-hidden rounded-control border border-line">
          <img src={shot} alt="Màn hình lúc node thất bại" className="block w-full" />
        </button>
      )}
      {r.output && <pre className="overflow-x-auto rounded-control bg-soft px-2.5 py-2 font-mono text-xs">{JSON.stringify(r.output, null, 1)}</pre>}
      {r.logs?.length ? <LogLines logs={r.logs} /> : <span className="text-xs text-muted">Không có log.</span>}
      {big && (
        <button onClick={() => setBig(false)} aria-label="Đóng ảnh" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6">
          <img src={shot} alt="Màn hình lúc node thất bại" className="max-h-full max-w-full rounded-control" />
        </button>
      )}
    </div>
  );
}

// Lỗi permission kèm id quyền thiếu (engine/detail.go permOf) → nút mở thẳng mục đó ở Cài đặt → Quyền.
function PermLink({ detail }: { detail?: Record<string, unknown> }) {
  const id = detail?.permission;
  if (typeof id !== 'string') return null;
  return <button onClick={() => openSettings('perms', id)} className="ml-2 underline">Mở Cài đặt → Quyền</button>;
}
