// Menu dọc của Cài đặt: ít mục, mục gom nhiều phần thì AppSettings hiện tab ngang gạch chân (TabBtn – cùng kiểu Inspector node). SettingsTab cũ là id của phần –
// openSettings('perms') mở mục chứa nó và chọn sẵn tab đó. Chỉ hiển thị – AppSettings giữ phần đang mở.
import type { SettingsTab } from '../../settingsNav';
import { MsgKey, useT } from '../../i18n';

export type SettingsPage = { id: string; key: MsgKey; sections: { id: SettingsTab; key: MsgKey }[] };

export const SETTINGS_PAGES: SettingsPage[] = [
  { id: 'ui', key: 'settings.ui', sections: [{ id: 'ui', key: 'settings.ui' }] },
  { id: 'storage', key: 'st.storage', sections: [{ id: 'storage', key: 'st.storage.dir' }, { id: 'sync', key: 'st.sync' }] },
  { id: 'run', key: 'st.run', sections: [{ id: 'overlay', key: 'st.overlay' }, { id: 'browser', key: 'st.browser' }] },
  { id: 'security', key: 'st.security', sections: [{ id: 'secrets', key: 'st.secrets' }, { id: 'perms', key: 'st.perms' }] },
  { id: 'ai', key: 'st.ai', sections: [{ id: 'mcp', key: 'st.mcp' }, { id: 'askai', key: 'st.askai' }, { id: 'servers', key: 'st.servers' }] },
  { id: 'api', key: 'st.api', sections: [{ id: 'api', key: 'st.api' }] },
  { id: 'about', key: 'st.about', sections: [{ id: 'about', key: 'st.about' }] },
];

export const pageOf = (t: SettingsTab) => SETTINGS_PAGES.find((p) => p.sections.some((s) => s.id === t)) ?? SETTINGS_PAGES[0];

export default function SettingsNav({ page, onChange }: { page: SettingsPage; onChange: (p: SettingsPage) => void }) {
  const t = useT();
  return (
    <nav aria-label={t('st.nav')} className="flex w-36 flex-none flex-col gap-[2px] overflow-y-auto border-r border-line pr-3">
      {SETTINGS_PAGES.map((p) => (
        <button key={p.id} onClick={() => onChange(p)} aria-current={page.id === p.id ? 'page' : undefined}
          className={`h-8 rounded-md px-2.5 text-left whitespace-nowrap ${page.id === p.id ? 'bg-soft font-semibold text-ink' : 'text-muted hover:bg-hover hover:text-ink'}`}>
          {t(p.key)}
        </button>
      ))}
    </nav>
  );
}
