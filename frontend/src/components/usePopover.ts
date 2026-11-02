// Popup / menu gắn vào một nút: bấm ra ngoài khung hoặc Esc thì đóng. Dùng cho nút vòng lặp, menu Chạy, menu theme.
import { useEffect, useRef, useState } from 'react';

// Nghe mousedown ở pha capture: canvas flow (d3-zoom của React Flow) chặn mousedown lan lên window,
// nghe ở pha bubble thì bấm vào canvas không đóng được popup. Trả hàm gỡ.
export function onMouseDownAnywhere(fn: (e: MouseEvent) => void): () => void {
  window.addEventListener('mousedown', fn, true);
  return () => window.removeEventListener('mousedown', fn, true);
}

// escOnly: Esc chỉ đóng popup, không tới lắng nghe khác (overlay – Esc thoát overlay; nghe ở pha capture).
export function usePopover({ escOnly = false } = {}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key !== 'Escape' : ref.current?.contains(e.target as Node)) return;
      if (escOnly) e.stopPropagation();
      setOpen(false);
    };
    const off = onMouseDownAnywhere(close);
    window.addEventListener('keydown', close, escOnly);
    return () => {
      off();
      window.removeEventListener('keydown', close, escOnly);
    };
  }, [open, escOnly]);
  return { open, setOpen, ref };
}
