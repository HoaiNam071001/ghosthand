// Menu dọc của Cài đặt: ít mục, mục gom nhiều phần thì AppSettings hiện tab ngang gạch chân (TabBtn – cùng kiểu Inspector node). SettingsTab cũ là id của phần –
// openSettings('perms') mở mục chứa nó và chọn sẵn tab đó. Chỉ hiển thị – AppSettings giữ phần đang mở.
import type { SettingsTab } from '../../settingsNav';
import { MsgKey, useT } from '../../i18n';

export type SettingsPage = { id: string; label: string; sections: { id: SettingsTab; label: string }[]; labelKey?: MsgKey };

export const SETTINGS_PAGES: SettingsPage[] = [
  { id: 'ui', label: 'Giao diện', labelKey: 'settings.ui', sections: [{ id: 'ui', label: 'Giao diện' }] },
  { id: 'storage', label: 'Lưu trữ', sections: [{ id: 'storage', label: 'Thư mục' }, { id: 'sync', label: 'Đồng bộ' }] },
  { id: 'run', label: 'Khi chạy', sections: [{ id: 'overlay', label: 'Màn hình' }, { id: 'browser', label: 'Trình duyệt' }] },
  { id: 'security', label: 'Bảo mật', sections: [{ id: 'secrets', label: 'Bí mật' }, { id: 'perms', label: 'Quyền' }] },
  { id: 'ai', label: 'AI', sections: [{ id: 'mcp', label: 'AI điều khiển app (MCP)' }, { id: 'askai', label: 'Hỏi AI' }, { id: 'servers', label: 'MCP server ngoài' }] },
  { id: 'api', label: 'API', sections: [{ id: 'api', label: 'API' }] },
  { id: 'about', label: 'Giới thiệu', sections: [{ id: 'about', label: 'Giới thiệu' }] },
];

export const pageOf = (t: SettingsTab) => SETTINGS_PAGES.find((p) => p.sections.some((s) => s.id === t)) ?? SETTINGS_PAGES[0];

export default function SettingsNav({ page, onChange }: { page: SettingsPage; onChange: (p: SettingsPage) => void }) {
  const t = useT();
  return (
    <nav aria-label="Nhóm cài đặt" className="flex w-36 flex-none flex-col gap-[2px] overflow-y-auto border-r border-line pr-3">
      {SETTINGS_PAGES.map((p) => (
        <button key={p.id} onClick={() => onChange(p)} aria-current={page.id === p.id ? 'page' : undefined}
          className={`h-8 rounded-md px-2.5 text-left whitespace-nowrap ${page.id === p.id ? 'bg-soft font-semibold text-ink' : 'text-muted hover:bg-hover hover:text-ink'}`}>
          {p.labelKey ? t(p.labelKey) : p.label}
        </button>
      ))}
    </nav>
  );
}
