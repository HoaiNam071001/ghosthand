// Nút xoá ở đầu hộp Lịch sử chạy (bước 41 L3): xoá lần đang chọn ngay; "Xoá hết" hỏi lại ngay trong thanh.
// Chỉ hiển thị – RunsDialog gọi runStore.deleteRuns.
import { useState } from 'react';
import { useT } from '../../i18n';
import { Trash } from '../icons';

export default function RunsDelete({ count, canDelete, onDelete, onClear }: {
  count: number; canDelete: boolean; onDelete: () => void; onClear: () => void;
}) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  const btn = 'h-8 rounded-control border border-line px-2.5 text-[13px] enabled:hover:bg-hover disabled:opacity-50';
  if (asking) {
    return (
      <span className="flex items-center gap-1.5 rounded-control bg-soft px-2 py-1 text-[13px]">
        {t('runs.delAsk', { n: count })}
        <button onClick={() => { setAsking(false); onClear(); }} className="btn-danger-soft h-7 rounded-control px-2.5 font-semibold">{t('runs.delAll')}</button>
        <button onClick={() => setAsking(false)} className="h-7 rounded-control border border-line px-2.5 hover:bg-hover">{t('runs.cancel')}</button>
      </span>
    );
  }
  return (
    <>
      <button disabled={!canDelete} onClick={onDelete} title={t('runs.delOneTip')} className={`${btn} flex items-center gap-1.5`}>
        <Trash className="h-3.5 w-3.5" />{t('runs.delOne')}
      </button>
      <button disabled={!count} onClick={() => setAsking(true)} className={btn}>{t('runs.delAllAsk')}</button>
    </>
  );
}
