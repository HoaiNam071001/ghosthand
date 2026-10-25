// Danh sách tiến trình đang chạy để chọn (node Tiến trình, bước 50 E4) – chỉ hiển thị: gõ lọc không dấu, nặng CPU trước.
import { useState } from 'react';
import { fold } from '../../fold';
import { fieldBox } from '../NumInput';

export type ProcGroup = { name: string; count: number; cpu: number; memMB: number };

export function ProcessPicker({ procs, loading, error, onPick, onRefresh }: {
  procs: ProcGroup[]; loading: boolean; error?: string; onPick: (name: string) => void; onRefresh: () => void;
}) {
  const [q, setQ] = useState('');
  const shown = procs.filter((p) => !q || fold(p.name).includes(fold(q)));
  return (
    <div className="flex flex-col gap-1.5 rounded-control border border-line bg-field p-2">
      <div className="flex gap-1.5">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lọc theo tên tiến trình" aria-label="Lọc tiến trình"
          className={`${fieldBox} min-w-0 flex-1`} />
        <button onClick={onRefresh} className="h-8 rounded-control border border-line px-2.5 text-[13px] text-ink hover:bg-hover">Tải lại</button>
      </div>
      {error && <span className="text-xs text-danger-text">{error}</span>}
      <ul className="flex max-h-56 flex-col overflow-y-auto" aria-label="Tiến trình đang chạy">
        {shown.map((p) => (
          <li key={p.name}>
            <button onClick={() => onPick(p.name)} className="flex w-full items-center gap-2 rounded-control px-2 py-1 text-left hover:bg-hover">
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{p.name}{p.count > 1 && <span className="text-muted"> ×{p.count}</span>}</span>
              <span className="flex-none font-mono text-[11px] text-muted">{p.cpu.toFixed(0)}% · {Math.round(p.memMB)} MB</span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="px-2 py-1 text-xs text-muted">{loading ? 'Đang đọc tiến trình…' : procs.length ? 'Không tiến trình nào khớp' : 'Không thấy tiến trình nào'}</li>}
      </ul>
    </div>
  );
}
