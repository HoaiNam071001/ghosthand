// Trang Tệp → Nhúng kịch bản (bước 39 G2, chuyển từ nút trên dòng đầu canvas): chép node của kịch bản khác vào đây thành một khung nhóm –
// từ file hoặc từ một kịch bản mẫu.
import { embedFile, embedSample } from '../../store';
import { inWails } from '../../windowMode';
import { useSamples } from '../samples/Samples';

const row = 'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-hover disabled:opacity-60';

export default function EmbedPage({ onDone }: { onDone: () => void }) {
  const { list } = useSamples();
  const pick = (run: () => void) => { onDone(); run(); };
  return (
    <div className="flex max-w-[640px] flex-col gap-3">
      <h2 className="text-xl font-semibold">Nhúng kịch bản</h2>
      <p className="text-muted">Chép node của kịch bản khác vào kịch bản đang soạn, gom thành một khung nhóm – dùng lại phần đã làm sẵn.</p>
      <div className="flex flex-col gap-px rounded-panel border border-line bg-surface p-1.5">
        <button disabled={!inWails} className={row} onClick={() => pick(embedFile)}>
          <span className="flex-1 font-semibold">Từ file…</span><span className="text-xs text-muted">chọn file kịch bản .json</span>
        </button>
        {(list ?? []).length > 0 && <div className="px-3 pt-2 pb-1 text-[11.5px] font-semibold text-muted uppercase">Từ mẫu thử</div>}
        {(list ?? []).map((s) => (
          <button key={s.id} className={row} onClick={() => pick(() => embedSample(s.id))}>
            <span className="flex-1 truncate">{s.name}</span><span className="text-xs text-muted">{s.app}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
