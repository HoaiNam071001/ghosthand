// Tab Dữ liệu của inspector (bước 60 V5): node nhận gì (ô có biến, nguồn – bấm để sang node đó, giá trị lần chạy gần
// nhất, Bỏ nối) và trả ra gì (biến, mô tả, giá trị, node nào đang dùng). Giá trị lấy từ nhật ký đang mở.
import { selectStep, unlinkData, useScript } from '../../store';
import { useRunLog } from '../../runStore';
import { dataSlots, usesOf, varExpr } from '../../flow/dataLinks';
import { dataPins, pick } from '../../flow/dataView';
import { nodeTitle } from '../../flow/view';
import { valueText } from '../../flow/runOutputs';
import { CopyButton } from '../settings/parts';
import { Section } from './InspectorParts';
import type { Step } from '../../types';

const chip = 'max-w-full self-start truncate rounded-[5px] bg-accent-soft px-1.5 py-px font-mono text-[11.5px] text-accent-text';
const link = 'inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-0.5 text-left text-xs hover:border-accent hover:text-accent-text';

export default function DataTab({ step: s }: { step: Step }) {
  const { steps } = useScript();
  const log = useRunLog();
  const last = log.open ? log.results.findLast((r) => r.nodeId === s.id) : undefined;
  const byRef = new Map(steps.map((x) => [x.ref, x]));
  const slots = dataSlots(s);
  const outs = dataPins(s, steps, last).outs;
  const uses = usesOf(steps, s.ref);
  const linkedCount = slots.filter((x) => x.refs.length).length;
  return (
    <>
      <Section title="Nhận vào" scope="data" defaultOpen summary={`${linkedCount}/${slots.length} ô nối biến`}>
        {!slots.length && <p className="text-xs text-muted">Node này không có ô nhận biến.</p>}
        <ul className="flex flex-col divide-y divide-line">
          {slots.map((sl) => (
            <li key={sl.name} className="flex flex-col gap-1 py-2 text-[13px]">
              <span className="flex items-baseline gap-2"><span className="font-medium">{sl.label}</span><span className="font-mono text-[11px] text-faint">{sl.name}</span></span>
              {sl.text ? <span className={sl.refs.length ? chip : 'self-start truncate rounded-[5px] bg-soft px-1.5 py-px font-mono text-[11.5px]'} title={sl.text}>{sl.text}</span>
                : <span className="text-xs text-faint">Trống – kéo ô vuông output của node chạy trước vào đây (rê thẻ để toả cổng, hoặc thẻ Đầy đủ)</span>}
              {sl.refs.map((r) => {
                const src = byRef.get(r.ref);
                return (
                  <span key={`${r.ref}.${r.key}`} className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    từ
                    <button onClick={() => src && selectStep(src.id)} disabled={!src} className={link} title={src ? 'Chọn node nguồn' : 'Không có node này'}>
                      <span className="font-mono text-[11px] text-muted">{r.ref}</span>{src ? nodeTitle(src) : '?'} · {r.key}
                    </button>
                    <button onClick={() => unlinkData(s.id, sl.name, r.ref, r.key)} className={link}>Bỏ nối</button>
                  </span>
                );
              })}
              {last?.input?.[sl.name] !== undefined && <RunValue v={last.input[sl.name]} />}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Trả ra" scope="data" defaultOpen summary={`${outs.length} biến`}>
        <ul className="flex flex-col divide-y divide-line">
          {outs.map((o) => {
            const users = uses.filter((u) => u.key === o.id);
            return (
              <li key={o.id} className="flex flex-col gap-1 py-2 text-[13px]">
                <span className="flex items-center gap-2">
                  <span className={chip}>{varExpr(s.ref, o.id)}</span>
                  <span className="ml-auto flex-none"><CopyButton text={varExpr(s.ref, o.id)} label={`Chép biến ${s.ref}.${o.id}`} /></span>
                </span>
                {o.tip && o.tip !== o.id && <span className="text-xs text-muted">{o.tip}</span>}
                {o.ran && <RunValue v={pick(last?.output, o.id)} />}
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  {users.length ? <>dùng ở {users.map((u) => {
                    const st = steps.find((x) => x.id === u.stepId);
                    return <button key={`${u.stepId}:${u.slot}`} onClick={() => selectStep(u.stepId)} className={link}><span className="font-mono text-[11px] text-muted">{st?.ref}</span>{u.label}</button>;
                  })}</> : <span className="text-faint">chưa node nào dùng</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>
      {!log.open && <p className="text-xs text-faint">Mở nhật ký một lần chạy để thấy giá trị thật đã đi qua node.</p>}
    </>
  );
}

function RunValue({ v }: { v: unknown }) {
  return <span className="flex items-baseline gap-1.5 text-xs text-muted">lần chạy <span className="min-w-0 break-words font-mono text-[11.5px] text-ok">{valueText(v)}</span></span>;
}
