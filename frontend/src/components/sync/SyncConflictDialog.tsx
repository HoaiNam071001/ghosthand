// Hộp hỏi khi đồng bộ gặp xung đột (bước 54 C4): hai bên cùng đổi một thứ. Không có lựa chọn "tự ghi đè" – đóng hộp / Esc = để đó,
// lần đồng bộ sau hỏi lại. Chỉ hiển thị: app thật dùng SyncConflictHost (nối store), màn mẫu #demo-sync truyền props.
import { useEffect } from 'react';
import { clockText, conflictLead } from '../../sync/text';
import type { SyncAnswer, SyncConflict } from '../../sync/types';

const KIND: Record<SyncConflict['kind'], string> = { script: 'Kịch bản', settings: 'Cài đặt', secrets: 'Kho bí mật' };

function Side({ title, time, note }: { title: string; time: string; note?: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-control border border-line bg-field p-2.5">
      <span className="text-xs text-muted">{title}</span>
      <span className="font-mono text-[13px]">{note ?? clockText(time)}</span>
    </div>
  );
}

export default function SyncConflictDialog({ ask, onAnswer }: { ask: SyncConflict | null; onAnswer: (a: SyncAnswer) => void }) {
  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onAnswer('skip');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ask, onAnswer]);
  if (!ask) return null;
  const btn = 'rounded-control border border-line bg-surface px-3.5 py-2 text-left hover:bg-hover';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[12vh]">
      <div role="alertdialog" aria-labelledby="sync-ask-title" className="flex w-[520px] max-w-full flex-col gap-3 rounded-panel border border-line bg-surface p-[18px] text-[13px] text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div id="sync-ask-title" className="text-base font-semibold">{KIND[ask.kind]} “{ask.name}” bị sửa ở hai nơi</div>
        <span>{conflictLead(ask)}</span>
        <div className="flex gap-2">
          <Side title="Máy này" time={ask.localTime} note={ask.localDeleted ? 'đã xoá' : ask.kind === 'script' ? undefined : 'bản trên máy'} />
          <Side title={`Cloud · ${ask.device || 'máy khác'}`} time={ask.remoteTime} note={ask.remoteDeleted ? 'đã xoá' : undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => onAnswer('local')} className={btn}><b>Giữ bản máy này</b><br /><span className="text-xs text-muted">{ask.localDeleted ? 'Xoá luôn trên cloud.' : 'Ghi đè bản trên cloud.'}</span></button>
          <button onClick={() => onAnswer('remote')} className={btn}><b>Lấy bản cloud</b><br /><span className="text-xs text-muted">{ask.remoteDeleted ? 'Xoá ở máy này.' : 'Ghi đè bản ở máy này.'}</span></button>
          {ask.canKeepBoth && (
            <button onClick={() => onAnswer('both')} className={btn}><b>Giữ cả hai</b><br /><span className="text-xs text-muted">Bản cloud lưu thành “{ask.name} ({ask.device || 'máy khác'})” cạnh bản của bạn.</span></button>
          )}
        </div>
        <div className="flex items-center border-t border-line pt-3">
          <span className="text-xs text-muted">Chưa chọn thì app giữ nguyên cả hai và hỏi lại lần sau.</span>
          <button onClick={() => onAnswer('skip')} className="ml-auto rounded-control border border-line bg-surface px-3.5 py-1.5 hover:bg-hover">Để sau <span className="font-mono text-[11px] text-muted">Esc</span></button>
        </div>
      </div>
    </div>
  );
}
