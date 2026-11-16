// Nút đổi giao diện Sáng / Tối / Theo hệ thống trên thanh tiêu đề (cạnh nút Cài đặt): hiện icon theme đang dùng, bấm mở menu nhỏ.
import { ReactNode } from 'react';
import { usePopover } from '../usePopover';
import { Monitor, Moon, Sun } from '../icons';
import { setTheme, Theme, useTheme } from '../../theme';

const THEMES: { id: Theme; label: string; icon: ReactNode }[] = [
  { id: 'light', label: 'Sáng', icon: <Sun /> },
  { id: 'dark', label: 'Tối', icon: <Moon /> },
  { id: 'system', label: 'Theo hệ thống', icon: <Monitor /> },
];

export default function ThemeSwitch() {
  const theme = useTheme();
  const { open, setOpen, ref } = usePopover();
  const cur = THEMES.find((t) => t.id === theme) ?? THEMES[2];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label={`Giao diện: ${cur.label}`} title={`Giao diện: ${cur.label}`} aria-haspopup="menu" aria-expanded={open}
        className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink">{cur.icon}</button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 flex w-44 flex-col gap-px rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgb(0_0_0/.14)]">
          {THEMES.map((t) => (
            <button key={t.id} role="menuitemradio" aria-checked={theme === t.id} onClick={() => { setTheme(t.id); setOpen(false); }}
              className={`flex h-8 items-center gap-2.5 rounded-[7px] px-2.5 text-left hover:bg-hover ${theme === t.id ? 'font-semibold text-ink' : 'text-muted'}`}>
              {t.icon}<span className="flex-1">{t.label}</span>{theme === t.id && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
