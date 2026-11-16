// Nút đổi giao diện Sáng / Tối / Theo hệ thống trên thanh tiêu đề (cạnh nút Cài đặt): hiện icon theme đang dùng, bấm mở menu nhỏ.
import { ReactNode } from 'react';
import { usePopover } from '../usePopover';
import { Monitor, Moon, Sun } from '../icons';
import { useT, MsgKey } from '../../i18n';
import { setTheme, Theme, useTheme } from '../../theme';

const THEMES: { id: Theme; key: MsgKey; icon: ReactNode }[] = [
  { id: 'light', key: 'theme.light', icon: <Sun /> },
  { id: 'dark', key: 'theme.dark', icon: <Moon /> },
  { id: 'system', key: 'theme.system', icon: <Monitor /> },
];

export default function ThemeSwitch() {
  const t = useT();
  const theme = useTheme();
  const { open, setOpen, ref } = usePopover();
  const cur = THEMES.find((t) => t.id === theme) ?? THEMES[2];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label={t('theme.current', { name: t(cur.key) })} title={t('theme.current', { name: t(cur.key) })} aria-haspopup="menu" aria-expanded={open}
        className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink">{cur.icon}</button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 flex w-44 flex-col gap-px rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgb(0_0_0/.14)]">
          {THEMES.map((th) => (
            <button key={th.id} role="menuitemradio" aria-checked={theme === th.id} onClick={() => { setTheme(th.id); setOpen(false); }}
              className={`flex h-8 items-center gap-2.5 rounded-[7px] px-2.5 text-left hover:bg-hover ${theme === th.id ? 'font-semibold text-ink' : 'text-muted'}`}>
              {th.icon}<span className="flex-1">{t(th.key)}</span>{theme === th.id && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
