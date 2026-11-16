// Kéo mép để đổi bề rộng cột (inspector) – nhớ trên máy (localStorage); bấm đúp mép = về mặc định.
import { useT } from '../i18n';
import { PointerEvent, useEffect, useState } from 'react';

export function usePanelWidth(key: string, def: number, min: number, max: number) {
  const clamp = (w: number) => Math.min(Math.max(Math.round(w), min), max);
  const [w, setW] = useState(() => {
    try {
      const v = Number(localStorage.getItem(key));
      return v ? clamp(v) : def;
    } catch {
      return def;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(w));
    } catch { /* không lưu được thì thôi – chỉ là tiện ích */ }
  }, [key, w]);
  return { width: w, setWidth: (v: number) => setW(clamp(v)), reset: () => setW(def) };
}

// edge: mép nằm bên nào của cột – 'right' (kéo sang phải = rộng ra) / 'left' (inspector, kéo sang trái = rộng ra).
// Đặt trong khung relative bọc ngoài cột (cột cuộn riêng thì tay kéo không trôi theo nội dung).
export function ResizeHandle({ edge, width, onWidth, onReset, label }: {
  edge: 'left' | 'right'; width: number; onWidth: (w: number) => void; onReset: () => void; label: string;
}) {
  const t = useT();
  const [drag, setDrag] = useState(false);
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = width;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(true);
    const el = e.currentTarget;
    const move = (ev: globalThis.PointerEvent) => onWidth(w0 + (edge === 'right' ? ev.clientX - x0 : x0 - ev.clientX));
    const up = () => {
      setDrag(false);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    document.body.style.cursor = 'col-resize';
  };
  return (
    <div role="separator" aria-orientation="vertical" aria-label={label} title={t('pr.tip', { l: label })}
      onPointerDown={down} onDoubleClick={onReset}
      className={`absolute top-0 bottom-0 z-20 w-[7px] cursor-col-resize ${edge === 'right' ? '-right-[4px]' : '-left-[4px]'} group`}>
      <span className={`absolute inset-y-0 left-[3px] w-px transition-colors ${drag ? 'bg-accent' : 'group-hover:bg-accent/60'}`} />
    </div>
  );
}
