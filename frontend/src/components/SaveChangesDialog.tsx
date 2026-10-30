// Hỏi lưu trước khi bỏ thay đổi chưa lưu (kịch bản mới, mở kịch bản khác, đóng app) – bước 21.
// Enter = Lưu, Esc = Huỷ.
import { useEffect } from 'react';
import { answerPending, useFile } from '../scriptFile';
import { useEditor } from '../store';

const WHY = { new: 'tạo kịch bản mới', open: 'mở kịch bản khác', recent: 'mở kịch bản khác', sample: 'mở kịch bản mẫu', import: 'nhập gói kịch bản', quit: 'đóng app' };

export default function SaveChangesDialog() {
  const { pending } = useFile();
  const { script: { name }, path } = useEditor();
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answerPending('cancel');
      else if (e.key === 'Enter') answerPending('save');
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pending]);
  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[14vh]"
      onMouseDown={(e) => e.target === e.currentTarget && answerPending('cancel')}>
      <div role="alertdialog" aria-labelledby="save-title" aria-describedby="save-desc"
        className="flex w-[400px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div className="flex flex-col gap-1 p-[18px]">
          <div id="save-title" className="text-base font-semibold">Lưu thay đổi của “{name}”?</div>
          <div id="save-desc" className="text-[13px] text-muted">
            Kịch bản có thay đổi chưa lưu xuống file. Không lưu thì các thay đổi này mất khi {WHY[pending.action]}.
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-line bg-chrome px-[18px] py-3">
          <button onClick={() => answerPending('discard')} className="h-9 rounded-control px-3 text-danger-text hover:bg-danger-soft">Không lưu</button>
          <button onClick={() => answerPending('cancel')} className="ml-auto h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">Huỷ</button>
          <button autoFocus onClick={() => answerPending('save')} className="btn-primary h-9 rounded-control px-4 font-semibold">{path ? 'Lưu' : 'Lưu…'}</button>
        </div>
      </div>
    </div>
  );
}
