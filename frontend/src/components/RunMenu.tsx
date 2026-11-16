// Nút Chạy tách đôi + menu cách chạy khác (design v3, artboard RunMenu): trái Chạy / Dừng (F8), phải ▾ mở menu
// (chạy từ node đang chọn, chạy từng node, xem trước, ghi thao tác…). Chỉ hiển thị – việc của từng mục do màn truyền vào.
import { usePopover } from './usePopover';
import { Play, Stop } from './icons';

export type RunMenuItem = {
  label: string;
  icon?: string; // path d của icon 24×24 (mục phụ không có)
  hotkey?: string;
  danger?: boolean; // icon màu danger (Ghi thao tác)
  minor?: boolean; // mục phụ nhỏ dưới gạch ngăn
  disabled?: boolean;
  title?: string; // tooltip (lý do tắt…)
  onClick?: () => void;
};

export function RunButton({ running, disabled, title, onRun, items, compact, badge }: {
  running: boolean; disabled?: boolean; title?: string; onRun: (e: { shiftKey: boolean }) => void; items: RunMenuItem[]; compact?: boolean; badge?: string; // badge: số lần lặp hiện cạnh chữ Chạy
}) {
  const { open, setOpen, ref } = usePopover();
  const main = items.filter((it) => !it.minor);
  const minor = items.filter((it) => it.minor);
  const half = `flex ${compact ? 'h-7' : 'h-[34px]'} items-center disabled:opacity-50`;
  return (
    <div ref={ref} className="relative flex">
      {/* style inline: btn-primary / btn-danger-soft tự đặt cả 4 viền – hai nửa dính nhau, ngăn bằng vạch sáng mờ */}
      <button onClick={onRun} disabled={disabled} title={title} style={{ borderRightWidth: 0 }}
        className={`${half} gap-[9px] rounded-l-control px-3.5 font-semibold ${running ? 'btn-danger-soft' : 'btn-primary'}`}>
        {running ? <><Stop className="h-2.5 w-2.5" />Dừng</> : <><Play className="h-2.5 w-2.5" />Chạy{badge && <span className="rounded-full bg-white/25 px-1.5 font-mono text-[11px] font-semibold" title="Số lần lặp kịch bản">{badge}</span>}</>}
        <span className="font-mono text-[11px] font-normal opacity-80">F8</span>
      </button>
      <button onClick={() => setOpen(!open)} aria-label="Cách chạy khác" aria-expanded={open} aria-haspopup="menu"
        style={{ borderLeftColor: 'rgb(255 255 255 / 0.3)' }}
        className={`${half} w-[30px] justify-center rounded-r-control ${running ? 'btn-danger-soft' : 'btn-primary'}`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1.5 flex w-[280px] flex-col gap-px rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgb(0_0_0/.14)]">
          {main.map((it) => <Item key={it.label} it={it} close={() => setOpen(false)} />)}
          {minor.length > 0 && <div className="mx-1.5 my-1 h-px bg-line" />}
          {minor.map((it) => <Item key={it.label} it={it} close={() => setOpen(false)} />)}
        </div>
      )}
    </div>
  );
}

function Item({ it, close }: { it: RunMenuItem; close: () => void }) {
  return (
    <button role="menuitem" disabled={it.disabled} title={it.title} onClick={() => { close(); it.onClick?.(); }}
      className={`flex items-center gap-2.5 rounded-[7px] px-2.5 text-left enabled:hover:bg-hover disabled:opacity-50 ${it.minor ? 'h-9 text-[12.5px] text-muted' : 'h-10'}`}>
      {it.icon && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-none ${it.danger ? 'text-danger-text' : 'text-muted'}`} aria-hidden><path d={it.icon} /></svg>
      )}
      <span className="flex-1">{it.label}</span>
      {it.hotkey && <span className="font-mono text-[11px] text-muted">{it.hotkey}</span>}
    </button>
  );
}

// Icon các mục menu (path d, 24×24)
export const RUN_ICON = {
  from: 'M5 4l10 8-10 8zM19 5v14',
  only: 'M8 5l10 7-10 7z',
  step: 'M4 12h12M12 6l6 6-6 6M20 5v14',
  preview: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  record: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
};
