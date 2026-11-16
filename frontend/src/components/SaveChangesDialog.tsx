// Hỏi lưu trước khi bỏ thay đổi chưa lưu (kịch bản mới, mở kịch bản khác) – bước 21.
// Enter = Lưu, Esc = Huỷ.
import { useT } from '../i18n';
import { useEffect } from 'react';
import { answerPending, useFile } from '../scriptFile';
import { useEditor } from '../store';

const WHY = { new: 'sc2.new', open: 'sc2.open', recent: 'sc2.open', sample: 'sc2.sample', import: 'sc2.import' } as const;

export default function SaveChangesDialog() {
  const t = useT();
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
          <div id="save-title" className="text-base font-semibold">{t('sc2.title', { n: name })}</div>
          <div id="save-desc" className="text-[13px] text-muted">
            {t('sc2.body', { why: t(WHY[pending.action]) })}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-line bg-chrome px-[18px] py-3">
          <button onClick={() => answerPending('discard')} className="h-9 rounded-control px-3 text-danger-text hover:bg-danger-soft">{t('sc2.discard')}</button>
          <button onClick={() => answerPending('cancel')} className="ml-auto h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">{t('msc.cancel')}</button>
          <button autoFocus onClick={() => answerPending('save')} className="btn-primary h-9 rounded-control px-4 font-semibold">{path ? t('msc.save') : t('sc2.saveAs')}</button>
        </div>
      </div>
    </div>
  );
}
