// Bảng chi tiết một lần chạy node trên cây (bước 60 V7): lỗi, ảnh lúc lỗi, VÀO (giá trị đã thay biến, biểu thức, lần chạy
// nguồn – bấm để nhảy tới), RA (bảng output + lần chạy dùng tiếp), đi tiếp, chuỗi truy ngược dữ liệu, log. Chỉ hiển thị.
import { useEffect, useState } from 'react';
import { StepIcon } from '../icons';
import { fmtMs, LogLines, StatusChip } from '../flow/PortField';
import OutputTable from '../flow/OutputTable';
import ElementMissView from '../flow/ElementMissView';
import { elementMissOf } from '../../flow/elementMiss';
import { outputRows } from '../../flow/outputRows';
import { outputsOf, nodeTitle } from '../../flow/view';
import { nodeCategory } from '../../flow/category';
import { dataSlots } from '../../flow/dataLinks';
import { valueText } from '../../flow/runOutputs';
import { pick } from '../../flow/dataView';
import { traceBack, type DataSource } from '../../flow/runTree';
import { portName } from '../../flow/runTreeView';
import type { RunRow } from '../flow/model';
import type { Step, StepResult } from '../../types';

type Props = { i: number; results: StepResult[]; rows: RunRow[]; steps: Step[]; sources: DataSource[][]; onJump: (i: number) => void; loadShot?: (shot: string) => Promise<string> };
const clip = (v: string) => (v.length > 90 ? `${v.slice(0, 89)}…` : v);
const link = 'inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-0.5 text-left text-xs hover:border-accent hover:text-accent-text';
const h3 = 'm-0 flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.08em] text-faint';

export default function RunTreeDetail({ i, results, rows, steps, sources, onJump, loadShot }: Props) {
  const r = results[i], row = rows[i];
  const step = steps.find((s) => s.id === r.nodeId);
  const label = (j: number) => `${results[j].ref} ${(() => { const s = steps.find((x) => x.id === results[j].nodeId); return s ? nodeTitle(s) : ''; })()}${results[j].iter ? ` · lượt ${results[j].iter!.index}` : ''}`;
  const slots = step ? dataSlots(step) : [];
  const ins = Object.entries(r.input ?? {});
  const src = sources[i] ?? [];
  const users = [...new Set(sources.flatMap((l, j) => (l.some((s) => s.from === i) ? [j] : [])))];
  const chain = traceBack(sources, i);
  const miss = elementMissOf(row?.error?.detail);
  return (
    <div className="flex flex-col gap-3">
      <div className={`cat-${step ? nodeCategory(step) : 'app'} flex items-center gap-2.5`}>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-cat-tile text-cat"><StepIcon type={step?.type ?? 'wait'} className="h-4 w-4" /></span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{step ? nodeTitle(step) : r.ref}{r.iter ? ` · lượt ${r.iter.index}` : ''}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="rounded-[5px] bg-soft px-1 font-mono text-[11px]">{r.ref}</span><StatusChip status={r.status} />
            <span className="font-mono">{row?.at} · {fmtMs(r.durationMs)}</span>
          </div>
        </div>
      </div>
      {r.error && <div className="rounded-control bg-danger-soft px-2.5 py-2 text-[13px] text-danger-text"><span className="font-mono text-xs">{r.error.code}</span> · {r.error.message}</div>}
      {miss && <ElementMissView miss={miss} />}
      {r.shot && loadShot && <Shot shot={r.shot} load={loadShot} />}
      <section className="flex flex-col gap-1.5">
        <h3 className={h3}>VÀO <span className="ml-auto font-medium tracking-normal text-muted">giá trị lúc chạy (đã thay biến)</span></h3>
        {ins.length ? (
          <dl className="m-0 overflow-hidden rounded-lg border border-line">
            {ins.map(([k, v]) => {
              const sl = slots.find((x) => x.name === k), s = src.find((x) => x.slot === k);
              return (
                <div key={k} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 border-t border-line px-2.5 py-1.5 text-[12.5px] first:border-t-0">
                  <dt className="break-words text-muted">{sl?.label ?? k}</dt>
                  <dd className="m-0 flex min-w-0 flex-col items-start gap-1">
                    <span className="break-words font-mono text-xs">{valueText(v)}</span>
                    {sl && <span className="break-all font-mono text-[10.5px] text-faint">{sl.text}</span>}
                    {s && <button onClick={() => onJump(s.from)} className={link}>{label(s.from)} · {s.key}</button>}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : <p className="m-0 text-xs text-muted">{r.input === undefined && slots.some((x) => x.refs.length) ? 'Lần chạy cũ – chưa lưu giá trị vào.' : 'Không có ô nào đọc biến.'}</p>}
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className={h3}>RA</h3>
        {r.output ? <OutputTable rows={outputRows(r.ref, r.output, step ? outputsOf(step) : [])} output={r.output} label={r.ref} /> : <p className="m-0 text-xs text-muted">Không có output.</p>}
        {users.length > 0 && <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">dùng tiếp ở {users.map((j) => <button key={j} onClick={() => onJump(j)} className={link}>{label(j)}</button>)}</span>}
      </section>
      {row?.port && <section className="flex flex-col gap-1"><h3 className={h3}>ĐI TIẾP</h3><span className="text-xs text-muted">cổng <b className="font-semibold text-ink">{portName(row.port)}</b>{row.next ? ` → ${row.next}` : ''}</span></section>}
      {chain.length > 1 && (
        <section className="flex flex-col gap-1.5">
          <h3 className={h3}>TRUY NGƯỢC DỮ LIỆU</h3>
          <ol className="m-0 ml-1.5 flex list-none flex-col gap-1 border-l-2 border-dashed border-data/60 py-0.5 pl-3">
            {chain.map((c) => (
              <li key={c.index}>
                <button onClick={() => onJump(c.index)} className={`flex flex-col rounded-md px-1.5 py-0.5 text-left text-xs hover:bg-hover ${c.index === i ? 'text-accent-text' : ''}`}>
                  <span>{label(c.index)}</span>
                  <span className="font-mono text-[11px] text-muted">{c.key ? `${c.key} = ${clip(valueText(pick(results[c.index].output, c.key) ?? '—'))}` : ''}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      {!!row?.logs?.length && <section className="flex flex-col gap-1"><h3 className={h3}>LOG</h3><LogLines logs={row.logs} /></section>}
    </div>
  );
}

function Shot({ shot, load }: { shot: string; load: (s: string) => Promise<string> }) {
  const [url, setUrl] = useState('');
  const [big, setBig] = useState(false);
  useEffect(() => { load(shot).then(setUrl); }, [shot, load]);
  if (!url) return null;
  return (
    <>
      <button onClick={() => setBig(true)} title="Màn hình lúc node thất bại – bấm để phóng to" className="overflow-hidden rounded-control border border-line">
        <img src={url} alt="Màn hình lúc node thất bại" className="block w-full" />
      </button>
      {big && <button onClick={() => setBig(false)} aria-label="Đóng ảnh" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"><img src={url} alt="Màn hình lúc node thất bại" className="max-h-full max-w-full rounded-control" /></button>}
    </>
  );
}
