// Danh sách cửa sổ đang mở để chọn (node Cửa sổ, bước 26) – chỉ hiển thị: gõ lọc không dấu theo app / tiêu đề.
import { useT } from '../../i18n';
import { useState } from 'react';
import { fold } from '../../fold';
import type { WindowInfo } from '../../flow/window';
import { fieldBox } from '../NumInput';

export function WindowPicker({ wins, error, onPick, onRefresh }: {
  wins: WindowInfo[]; error?: string; onPick: (w: WindowInfo) => void; onRefresh: () => void;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const shown = wins.filter((w) => !q || fold(`${w.app} ${w.title}`).includes(fold(q)));
  return (
    <div className="flex flex-col gap-1.5 rounded-control border border-line bg-field p-2">
      <div className="flex gap-1.5">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('wp.filter')} aria-label={t('wp.filterLabel')}
          className={`${fieldBox} min-w-0 flex-1`} />
        <button onClick={onRefresh} className="h-8 rounded-control border border-line px-2.5 text-[13px] text-ink hover:bg-hover">{t('wp.reload')}</button>
      </div>
      {error && <span className="text-xs text-danger-text">{error}</span>}
      <ul className="flex max-h-56 flex-col overflow-y-auto" aria-label={t('wp.list')}>
        {shown.map((w) => (
          <li key={w.id}>
            <button onClick={() => onPick(w)} className="flex w-full flex-col items-start rounded-control px-2 py-1 text-left hover:bg-hover">
              <span className="w-full truncate text-[13px] text-ink">{w.title || t('wp.noTitle')}</span>
              <span className="font-mono text-[11px] text-muted">
                {w.app}{w.minimized ? ` · ${t('wp.min')}` : ` · ${t('wp.at', { w: w.box.w, h: w.box.h, x: w.box.x, y: w.box.y })}`}
              </span>
            </button>
          </li>
        ))}
        {!shown.length && !error && <li className="px-2 py-1 text-xs text-muted">{wins.length ? t('wp.noMatch') : t('wp.none')}</li>}
      </ul>
    </div>
  );
}
