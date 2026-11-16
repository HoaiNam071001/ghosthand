// Nút ⋯ trong ô nhập của inspector (design v3 FieldKit): rê vào ô mới hiện, bấm mở menu tuỳ chọn của ô
// (dùng biến, đặt làm input, về mặc định, giải thích). Chỉ hiển thị – mục do nơi dùng truyền vào.
import { useT } from '../i18n';
import { CSSProperties, useState } from 'react';
import { usePopover } from './usePopover';

export type FieldMenuItem = { label: string; icon?: string; sub?: string; mono?: boolean; disabled?: boolean; title?: string; onClick: () => void };

export const MENU_ICON = {
  variable: 'M8 4c-2 0-3 1-3 3v2c0 1-1 3-2 3 1 0 2 2 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1 1 3 2 3-1 0-2 2-2 3v2c0 2-1 3-3 3M10 9l4 6M14 9l-4 6',
  pin: 'M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6',
  reset: 'M4 12a8 8 0 1 0 3-6.3M4 4v5h5',
};

const Dots = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
);

// help: chữ "Ô này dùng để làm gì" ở cuối menu. Menu đặt fixed theo nút – inspector cuộn (overflow) sẽ cắt nếu absolute.
export function FieldMenu({ items, help }: { items: FieldMenuItem[]; help?: string }) {
  const t = useT();
  const { open, setOpen, ref } = usePopover();
  const [pos, setPos] = useState<CSSProperties>({});
  if (!items.length && !help) return null;
  const toggle = () => {
    const r = ref.current!.getBoundingClientRect();
    const up = r.bottom + 60 + items.length * 38 + (help ? 70 : 0) > window.innerHeight;
    setPos({ right: Math.max(window.innerWidth - r.right - 4, 8), ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
    setOpen(!open);
  };
  return (
    <div ref={ref} className="flex-none">
      <button type="button" onClick={toggle} aria-label={t('fm.opts')} aria-expanded={open} aria-haspopup="menu"
        className={`grid h-[26px] w-[26px] place-items-center rounded-[5px] ${open ? 'bg-accent-soft text-accent-text' : 'bg-soft text-muted opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100 hover:text-ink'}`}>
        <Dots />
      </button>
      {open && (
        <div role="menu" style={pos} className="fixed z-40 flex w-[226px] flex-col gap-px rounded-[9px] border border-line bg-surface p-[5px] shadow-[0_10px_28px_rgb(0_0_0/.14)]">
          {items.map((it) => (
            <button key={it.label} role="menuitem" disabled={it.disabled} title={it.title} onClick={() => { setOpen(false); it.onClick(); }}
              className="flex min-h-9 items-center gap-2.5 rounded-md px-[9px] py-1 text-left text-[13px] enabled:hover:bg-hover disabled:opacity-50">
              {it.icon
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-muted" aria-hidden><path d={it.icon} /></svg>
                : <span className="w-[15px] flex-none" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate ${it.mono ? 'font-mono text-xs text-accent-text' : ''}`}>{it.label}</span>
                {it.sub && <span className="truncate text-xs text-muted">{it.sub}</span>}
              </span>
            </button>
          ))}
          {help && <p className="mt-0.5 border-t border-line px-[9px] pt-1.5 pb-1 text-xs leading-snug text-muted">{help}</p>}
        </div>
      )}
    </div>
  );
}
