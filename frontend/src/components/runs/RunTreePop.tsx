// Popover khi rê thẻ trên cây lần chạy (bước 60 V7): VÀO (giá trị đã thay biến + lần chạy nguồn), RA (giá trị + lần chạy
// dùng nó), lỗi nếu có. Chỉ hiển thị.
import { valueText } from '../../flow/runOutputs';
import type { DataSource } from '../../flow/runTree';
import { fmtMs } from '../flow/PortField';
import { nodeTitle } from '../../flow/view';
import type { Step, StepResult } from '../../types';

export default function RunTreePop({ i, results, steps, sources }: { i: number; results: StepResult[]; steps: Step[]; sources: DataSource[][] }) {
  const r = results[i];
  const step = steps.find((s) => s.id === r.nodeId);
  const refAt = (j: number) => `${results[j].ref}${results[j].iter ? ` · lượt ${results[j].iter!.index}` : ''}`;
  const src = new Map((sources[i] ?? []).map((s) => [s.slot, s]));
  const users = (key: string) => [...new Set(sources.flatMap((list, j) => (list.some((s) => s.from === i && s.key === key) ? [results[j].ref] : [])))];
  const ins = Object.entries(r.input ?? {});
  const outs = Object.entries(r.output ?? {}).filter(([k]) => k !== 'startedAt' && k !== 'durationMs').slice(0, 8);
  return (
    <div role="tooltip" className="flex w-[280px] flex-col gap-1.5 rounded-[10px] border border-line bg-surface px-2.5 pb-2.5 pt-2 text-xs shadow-[0_12px_32px_rgb(0_0_0/.2)]">
      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
        <span className="font-mono text-[10.5px] font-normal text-muted">{r.ref}</span>
        <span className="min-w-0 flex-1 truncate">{step ? nodeTitle(step) : r.ref}{r.iter ? ` · lượt ${r.iter.index}` : ''}</span>
        <span className="font-mono text-[10.5px] font-normal text-muted">{fmtMs(r.durationMs)}</span>
      </div>
      <Head>VÀO</Head>
      {ins.length ? ins.map(([k, v]) => {
        const s = src.get(k);
        return <Row key={k} k={s?.label ?? k} v={valueText(v)} tone="text-accent-text" note={s ? `từ ${refAt(s.from)} · ${s.key}` : undefined} />;
      }) : <span className="text-faint">Không có ô nào đọc biến</span>}
      <Head>RA</Head>
      {outs.length ? outs.map(([k, v]) => {
        const u = users(k);
        return <Row key={k} k={k} v={valueText(v)} tone="text-ok" note={u.length ? `→ ${u.join(', ')}` : undefined} mono />;
      }) : <span className="text-faint">Không có output</span>}
      {r.error && <div className="rounded-md bg-danger-soft px-2 py-1 text-danger-text"><span className="font-mono text-[11px]">{r.error.code}</span> · {r.error.message}</div>}
    </div>
  );
}

const Head = ({ children }: { children: string }) => <h4 className="m-0 text-[10px] font-bold tracking-[.08em] text-faint">{children}</h4>;

function Row({ k, v, tone, note, mono }: { k: string; v: string; tone: string; note?: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[78px_minmax(0,1fr)] items-baseline gap-1.5">
      <span className={`break-words text-muted ${mono ? 'font-mono text-[11px]' : ''}`}>{k}</span>
      <span className={`break-words font-mono text-[11px] ${tone}`}>{v.length > 120 ? `${v.slice(0, 119)}…` : v}
        {note && <span className="block font-sans text-[10.5px] text-faint">{note}</span>}</span>
    </div>
  );
}
