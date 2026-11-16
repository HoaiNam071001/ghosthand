// Danh sách app đang chạy để chọn (node Ứng dụng, bước 26) – chỉ hiển thị: gõ lọc không dấu, app có cửa sổ trước.
import { useT } from '../../i18n';
import { useState } from 'react';
import { fold } from '../../fold';
import { appChoices, type AppInfo } from '../../flow/app';
import { fieldBox } from '../NumInput';

export function AppPicker({ apps, error, onPick, onRefresh }: {
  apps: AppInfo[]; error?: string; onPick: (a: AppInfo) => void; onRefresh: () => void;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const shown = appChoices(apps).filter((a) => !q || fold(`${a.name} ${a.id}`).includes(fold(q)));
  return (
    <div className="flex flex-col gap-1.5 rounded-control border border-line bg-field p-2">
      <div className="flex gap-1.5">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('apk.filter')} aria-label={t('apk.filterLabel')}
          className={`${fieldBox} min-w-0 flex-1`} />
        <button onClick={onRefresh} className="h-8 rounded-control border border-line px-2.5 text-[13px] text-ink hover:bg-hover">{t('wp.reload')}</button>
      </div>
      {error && <span className="text-xs text-danger-text">{error}</span>}
      <ul className="flex max-h-56 flex-col overflow-y-auto" aria-label={t('apk.list')}>
        {shown.map((a) => (
          <li key={a.pid}>
            <button onClick={() => onPick(a)} className="flex w-full flex-col items-start rounded-control px-2 py-1 text-left hover:bg-hover">
              <span className="w-full truncate text-[13px] text-ink">{a.name}</span>
              <span className="w-full truncate font-mono text-[11px] text-muted" title={a.id}>
                {a.windows ? t('ap.windows', { n: a.windows }) : t('apk.bg')}{a.id ? ` · ${a.id}` : ''}
              </span>
            </button>
          </li>
        ))}
        {!shown.length && !error && <li className="px-2 py-1 text-xs text-muted">{apps.length ? t('apk.noMatch') : t('apk.none')}</li>}
      </ul>
    </div>
  );
}
