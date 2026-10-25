// "App đã đọc được gì" khi node phần tử không thấy cái cần tìm (bước 50 A2): so với Accessibility Inspector.
import { CopyButton } from '../settings/parts';
import { ElementMiss, missHint, missText } from '../../flow/elementMiss';

export default function ElementMissView({ miss }: { miss: ElementMiss }) {
  return (
    <details className="rounded-control bg-soft px-2.5 py-2 text-xs" open>
      <summary className="cursor-pointer font-medium">App đã đọc {miss.read} phần tử</summary>
      <p className="my-1.5 text-muted">{missHint(miss)}</p>
      {miss.near.length > 0 && (
        <ul className="mb-1.5 flex flex-col gap-0.5">
          {miss.near.map((n, i) => (
            <li key={i} className="flex gap-2"><span className="w-9 flex-none font-mono text-accent-text">{n.score}%</span>
              <span className="min-w-0 truncate"><span className="font-mono text-muted">{n.role}</span> {n.name}</span></li>
          ))}
        </ul>
      )}
      {miss.roles.length > 0 && <p className="mb-1.5 font-mono text-muted">{miss.roles.slice(0, 12).map((r) => `${r.raw}×${r.count}`).join(' ')}</p>}
      <div className="max-h-48 overflow-y-auto font-mono">
        {miss.dump.map((d, i) => (
          <div key={i} style={{ paddingLeft: Math.min(d.depth, 8) * 8 }} className="truncate">
            <span className="text-muted">{d.raw}</span> {d.name}{d.value ? <span className="text-muted"> = {d.value}</span> : null}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-muted"><span className="flex-1">Chép danh sách đã đọc</span>
        <CopyButton text={missText(miss)} label="Chép danh sách phần tử đã đọc" /></div>
    </details>
  );
}
