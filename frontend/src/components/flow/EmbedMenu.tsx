// Nút "Nhúng kịch bản" trên dòng đầu canvas (bước 39 G2): menu chọn file hoặc một kịch bản mẫu.
import { useEffect, useState } from 'react';
import { Samples } from '../../../wailsjs/go/main/App';
import { embedFile, embedSample } from '../../store';
import { inWails } from '../../windowMode';
import { usePopover } from '../usePopover';
import { headerBtn } from './FlowHeader';

type Info = { id: string; name: string };
const item = 'block w-full truncate px-3 py-1.5 text-left text-[12.5px] hover:bg-hover';

export default function EmbedMenu() {
  const { open, setOpen, ref } = usePopover();
  const [list, setList] = useState<Info[]>([]);
  useEffect(() => {
    if (open && inWails) Samples().then((l) => setList(l ?? [])).catch(() => {});
  }, [open]);
  const pick = (run: () => void) => { setOpen(false); run(); };
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} disabled={!inWails} title="Chép node của kịch bản khác vào đây thành một khung nhóm" className={`${headerBtn} disabled:opacity-50`}>
        Nhúng kịch bản
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 max-h-72 w-60 overflow-auto rounded-control border border-line bg-surface py-1 shadow-lg">
          <button className={item} onClick={() => pick(embedFile)}>Từ file…</button>
          {list.length > 0 && <div className="px-3 pt-1.5 pb-0.5 text-[11px] text-muted">Mẫu thử</div>}
          {list.map((s) => <button key={s.id} className={item} onClick={() => pick(() => embedSample(s.id))}>{s.name}</button>)}
        </div>
      )}
    </div>
  );
}
