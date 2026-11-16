// Xác nhận thao tác nguy hiểm trước lần chạy đầu (xoá file, buộc thoát app, đóng cửa sổ) – liệt kê từng node làm gì.
// Enter = Chạy, Esc = Huỷ.
import { useT } from '../i18n';
import { useEffect } from 'react';
import { answerDanger, useDangerAsk } from '../dangerConfirm';
import { dangerOpText, dangerScript, dangerTitle, isPermanent } from '../flow/danger';
import { Power, Trash } from './icons';

export default function DangerConfirmDialog() {
  const t = useT();
  const ask = useDangerAsk();
  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answerDanger(false);
      else if (e.key === 'Enter') answerDanger(true);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ask]);
  if (!ask) return null;
  const files = ask.ops.every((o) => o.op === 'trash' || o.op === 'emptyTrash');
  const Icon = files ? Trash : Power;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[14vh]"
      onMouseDown={(e) => e.target === e.currentTarget && answerDanger(false)}>
      <div role="alertdialog" aria-labelledby="danger-title" aria-describedby="danger-desc"
        className="flex w-[460px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div className="flex gap-3 p-[18px]">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[9px] bg-danger-soft text-danger-text"><Icon className="h-[18px] w-[18px]" /></span>
          <div className="flex min-w-0 flex-col gap-2">
            <div id="danger-title" className="text-base font-semibold">{dangerTitle(ask.ops)}</div>
            <ul id="danger-desc" className="flex flex-col gap-1.5 text-[13px]">
              {ask.ops.map((o, i) => (
                <li key={i} className="flex gap-2"><span className="flex-none rounded bg-soft px-1.5 font-mono text-xs leading-5 text-muted">{o.ref}</span>
                  <span className="min-w-0 flex-1"><span className={isPermanent(o) ? 'text-danger-text' : ''}>{dangerOpText(o)}</span>
                    {dangerScript(o) && <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-control bg-field px-2 py-1.5 font-mono text-xs text-ink">{dangerScript(o)}</pre>}</span></li>
              ))}
            </ul>
            <span className="text-xs text-muted">{t('dd.note')}{ask.ops.some((o) => o.op === 'emptyTrash') ? ' ' + t('dd.trash') : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-line bg-chrome px-[18px] py-3">
          <button onClick={() => answerDanger(false)} className="ml-auto h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">{t('msc.cancel')} <span className="font-mono text-[11px] text-muted">Esc</span></button>
          <button autoFocus onClick={() => answerDanger(true)} className="btn-danger-soft h-9 rounded-control px-4 font-semibold">{files ? t('dd.allowDelete') : t('dd.allow')}</button>
        </div>
      </div>
    </div>
  );
}
