// Thanh tiêu đề tự vẽ kiểu Windows 11 (cửa sổ frameless): kéo được cửa sổ, nút thu nhỏ / phóng to / đóng bên phải.
import { Quit, WindowMinimise, WindowToggleMaximise } from '../../wailsjs/runtime/runtime';
import { inWails } from '../windowMode';
import { ReactNode } from 'react';
import { usePopover } from './usePopover';
import { Help, Logo, Monitor, Moon, Sun } from './icons';
import { setTheme, Theme, useTheme } from '../theme';
import AppSettings from './AppSettings';
import PageCheckButton from './pagecheck/PageCheckButton';
import Guide from './guide/Guide';
import { openGuide } from '../guideNav';

const winBase = 'grid h-9 w-11 place-items-center text-ink';
const winBtn = `${winBase} hover:bg-hover`;
// Nút đóng: nền đỏ khi rê chuột (không gộp với hover:bg-hover – hai class hover cùng lúc thì bg-hover thắng)
const closeBtn = `${winBase} hover:bg-danger hover:text-white`;

export default function TitleBar() {
  return (
    // double click vùng kéo = phóng to / thu về, giống cửa sổ thường. Sự kiện từ modal / popup con cũng nổi lên đây
    // → chỉ nhận khi chỗ bấm thật sự là vùng kéo (cùng biến CSS Wails dùng).
    <div className="drag flex h-9 flex-none items-center gap-2 bg-chrome pl-3.5"
      onDoubleClick={(e) => inWails && isDragArea(e.target as HTMLElement) && WindowToggleMaximise()}>
      <Logo className="h-[15px] w-[15px] flex-none" />
      <span className="text-xs text-muted">Ghosthand</span>
      <ThemeSwitch />
      <button onClick={() => openGuide()} aria-label="Hướng dẫn" title="Hướng dẫn (F1)"
        className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink"><Help /></button>
      <Guide />
      {inWails && <PageCheckButton />}
      {inWails && <AppSettings />}
      {inWails && (
        <div className="flex">
          <button aria-label="Thu nhỏ" onClick={WindowMinimise} className={winBtn}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0 5h10" stroke="currentColor" /></svg>
          </button>
          <button aria-label="Phóng to" onClick={WindowToggleMaximise} className={winBtn}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><rect x=".5" y=".5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" /></svg>
          </button>
          <button aria-label="Đóng" onClick={Quit} className={closeBtn}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

function isDragArea(el: HTMLElement) {
  return getComputedStyle(el).getPropertyValue('--wails-draggable').trim() === 'drag';
}

const THEMES: { id: Theme; label: string; icon: ReactNode }[] = [
  { id: 'light', label: 'Sáng', icon: <Sun /> },
  { id: 'dark', label: 'Tối', icon: <Moon /> },
  { id: 'system', label: 'Theo hệ thống', icon: <Monitor /> },
];

// Chọn theme: một nút (icon theme đang dùng) mở menu Sáng / Tối / Theo hệ thống – lưu vào cấu hình app.
function ThemeSwitch() {
  const theme = useTheme();
  const { open, setOpen, ref } = usePopover();
  const cur = THEMES.find((t) => t.id === theme) ?? THEMES[2];
  return (
    <div ref={ref} className="relative ml-auto">
      <button onClick={() => setOpen(!open)} aria-label={`Giao diện: ${cur.label}`} title={`Giao diện: ${cur.label}`} aria-haspopup="menu" aria-expanded={open}
        className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink">{cur.icon}</button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 flex w-44 flex-col gap-px rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgb(0_0_0/.14)]">
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
