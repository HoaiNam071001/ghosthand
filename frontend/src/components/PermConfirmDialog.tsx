// Báo thiếu quyền hệ điều hành trước khi chạy (bước 48 P4). Enter = Vẫn chạy, Esc = Huỷ; không chặn cứng.
import { useEffect } from 'react';
import { answerPerm, usePermAsk } from '../permConfirm';
import { openSettings } from '../settingsNav';

export default function PermConfirmDialog() {
  const ask = usePermAsk();
  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answerPerm(false);
      else if (e.key === 'Enter') answerPerm(true);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ask]);
  if (!ask) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[14vh]"
      onMouseDown={(e) => e.target === e.currentTarget && answerPerm(false)}>
      <div role="alertdialog" aria-labelledby="perm-title" aria-describedby="perm-desc"
        className="flex w-[460px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div className="flex flex-col gap-2 p-[18px]">
          <div id="perm-title" className="text-base font-semibold">Kịch bản cần quyền chưa cấp</div>
          <ul id="perm-desc" className="list-inside list-disc text-[13px]">{ask.names.map((n) => <li key={n}>{n}</li>)}</ul>
          <span className="text-xs text-muted">Chạy khi thiếu quyền thì node liên quan sẽ báo lỗi permission. Cấp xong ở System Settings rồi bấm Chạy lại.</span>
        </div>
        <div className="flex items-center gap-2 border-t border-line bg-chrome px-[18px] py-3">
          <button onClick={() => answerPerm(false)} className="h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">Huỷ <span className="font-mono text-[11px] text-muted">Esc</span></button>
          <button onClick={() => { answerPerm(false); openSettings('perms'); }} className="ml-auto h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">Mở Cài đặt</button>
          <button autoFocus onClick={() => answerPerm(true)} className="btn-primary h-9 rounded-control px-4 font-semibold">Vẫn chạy</button>
        </div>
      </div>
    </div>
  );
}
