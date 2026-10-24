// Menu chuột phải của thẻ node: chạy đến đây / chạy cụm / chạy tiếp, ghim output. Chỉ hiển thị – việc do nơi gọi truyền vào.
import { useEffect, useRef } from 'react';
import type { RunMenuItem } from '../RunMenu';

export default function NodeMenu({ x, y, title, items, onClose }: { x: number; y: number; title: string; items: RunMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key !== 'Escape' : ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [onClose]);
  // không để menu tràn khỏi cửa sổ
  const left = Math.min(x, window.innerWidth - 288);
  const top = Math.min(y, window.innerHeight - 20 - items.length * 40);
  return (
    <div ref={ref} role="menu" style={{ left, top }}
      className="fixed z-40 flex w-[280px] flex-col gap-px rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgb(0_0_0/.14)]">
      <div className="truncate px-2.5 pb-1 pt-0.5 font-mono text-[11px] text-muted">{title}</div>
      {items.map((it) => (
        <button key={it.label} role="menuitem" disabled={it.disabled} title={it.title} onClick={() => { onClose(); it.onClick?.(); }}
          className="flex h-9 items-center gap-2.5 rounded-[7px] px-2.5 text-left enabled:hover:bg-hover disabled:opacity-50">
          <span className="flex-1">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
