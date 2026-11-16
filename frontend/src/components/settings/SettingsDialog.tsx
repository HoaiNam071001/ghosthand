// Cài đặt dạng hộp thoại (bước 63): mở bằng ⚙ / Ctrl+, / ribbon Công cụ / openSettings(tab) – trạng thái ở shellStore. Esc, ✕ hoặc bấm nền để đóng.
import { useEffect } from 'react';
import AppSettings from '../AppSettings';
import { closeSettings, useShell } from '../../shellStore';

export default function SettingsDialog() {
  const { settingsOpen } = useShell();
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && !(e.target as HTMLElement).closest?.('input, textarea, select, [aria-expanded=true]') && closeSettings();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);
  if (!settingsOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/25 px-4 pt-[6vh]" onMouseDown={(e) => e.target === e.currentTarget && closeSettings()}>
      <div role="dialog" aria-modal="true" aria-label="Cài đặt" className="relative flex h-[80vh] max-h-[88vh] w-[860px] max-w-full flex-col rounded-panel border border-line bg-surface p-[18px] shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <button onClick={closeSettings} aria-label="Đóng" className="absolute top-3 right-3 rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-ink">✕</button>
        <AppSettings />
      </div>
    </div>
  );
}
