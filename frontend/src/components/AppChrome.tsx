// Khung chung của màn soạn (design v3): status bar + nút vòng lặp cạnh nút Chạy (cạnh phải hàng tab ribbon – bước 63).
// Dùng cho MainScreen (dữ liệu thật) và màn mẫu (#demo, #demo-flow).
import { tr } from '../i18n/lang';
import { ReactNode, useState } from 'react';
import { Loop } from './icons';
import { useLang } from '../i18n';
import { usePopover } from './usePopover';

// Status bar: chấm trạng thái, toạ độ chuột, các thông báo (children), end = thanh zoom ở góc phải.
export function StatusBar({ running, mouse, children, end }: { running: boolean; mouse: string; children?: ReactNode; end?: ReactNode }) {
  useLang();
  return (
    <footer className="@container flex flex-none items-center gap-x-4 overflow-hidden border-t border-line bg-chrome px-4 py-[3px] whitespace-nowrap text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className={`h-[7px] w-[7px] rounded-full ${running ? 'bg-accent' : 'bg-ok'}`} />{running ? tr('status.running') : tr('status.ready')}
      </span>
      <span className="font-mono">{mouse}</span>
      <span className="flex min-w-0 flex-1 items-center gap-x-4 overflow-hidden [&>*]:flex-none [&>*]:truncate">{children}</span>
      <span className="ml-auto" />
      <span className="flex-none">{end}</span>
    </footer>
  );
}

// Nút "10 vòng" trong tab Chạy của ribbon: mở popup cài đặt chạy (lặp, đếm ngược…). Popup đặt fixed theo nút vì thân ribbon cắt phần tràn.
export function LoopButton({ summary, children }: { summary: string; children: ReactNode }) {
  useLang();
  const { open, setOpen, ref } = usePopover();
  const [at, setAt] = useState({ left: 0, top: 0 });
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setAt({ left: Math.min(r.left, window.innerWidth - 356), top: r.bottom + 6 });
    setOpen(!open);
  };
  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-expanded={open} title={tr('loop.tip')}
        className="flex h-[66px] min-w-[52px] flex-col items-center gap-1.5 rounded-[7px] px-2.5 pt-[7px] text-[11.5px] hover:bg-hover">
        <Loop className="h-6 w-6" /><span className="font-mono">{summary}</span>
      </button>
      {open && (
        <div role="dialog" aria-label={tr('loop.aria')} style={{ left: at.left, top: at.top, maxHeight: `calc(100vh - ${at.top + 12}px)` }}
          className="fixed z-50 w-[340px] overflow-y-auto rounded-panel border border-line bg-surface p-4 shadow-[0_8px_28px_rgb(0_0_0/.16)]">
          {children}
        </div>
      )}
    </div>
  );
}
