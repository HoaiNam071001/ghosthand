// Cài đặt → Lưu trữ (bước 41 L2): thư mục kịch bản (lưu tay / AI tạo) và ảnh chụp. Ô trống = mặc định (hiện mờ).
// Chỉ hiển thị – AppSettings chọn / mở thư mục qua Go và lưu.
import { tr } from '../../i18n/lang';
import { store } from '../../../wailsjs/go/models';

import { useLang } from '../../i18n';
export type StorageKey = keyof store.StorageSettings;

const ROWS = (): { key: StorageKey; title: string; hint: string }[] => [
  { key: 'scriptsDir', title: tr('stor.scripts'), hint: tr('stor.scripts.hint') },
  { key: 'aiScriptsDir', title: tr('stor.ai'), hint: tr('stor.ai.hint') },
  { key: 'shotsDir', title: tr('stor.shots'), hint: tr('stor.shots.hint') },
];

export default function StorageSettings({ storage, defaults, onPick, onOpen, onReset }: {
  storage: store.StorageSettings; defaults: store.StorageDefaults | null;
  onPick: (key: StorageKey, from: string) => void; onOpen: (dir: string) => void; onReset: (key: StorageKey) => void;
}) {
  const fallback = (key: StorageKey) =>
    key === 'aiScriptsDir' ? storage.scriptsDir || defaults?.scriptsDir || '' : key === 'shotsDir' ? defaults?.shotsDir ?? '' : defaults?.scriptsDir ?? '';
  const btn = 'h-7 rounded-control border border-line px-2.5 text-xs hover:bg-hover';
  useLang();
  return (
    <>
      {ROWS().map(({ key, title, hint }, i) => {
        const custom = storage[key] ?? '';
        const dir = custom || fallback(key);
        return (
          <div key={key} className={`flex flex-col gap-1.5 ${i ? 'border-t border-line pt-3' : ''}`}>
            <span className="flex flex-col">{title}<span className="text-xs text-muted">{hint}</span></span>
            <code title={dir} className={`truncate rounded-control bg-field px-2 py-1.5 font-mono text-xs ${custom ? 'text-ink' : 'text-muted'}`}>
              {custom || tr(key === 'aiScriptsDir' ? 'stor.defaultAi' : 'stor.default', { dir })}
            </code>
            <span className="flex gap-1.5">
              <button onClick={() => onPick(key, dir)} className={btn}>{tr('stor.pick')}</button>
              <button onClick={() => onOpen(dir)} disabled={!dir} className={btn} title={tr('stor.openTip')}>{tr('stor.open')}</button>
              {custom && <button onClick={() => onReset(key)} className={btn}>{tr('stor.reset')}</button>}
            </span>
          </div>
        );
      })}
      <span className="text-xs text-muted">{tr('stor.note')}</span>
    </>
  );
}
