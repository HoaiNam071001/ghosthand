// Khung đích của node Cửa sổ "Đặt vị trí + cỡ" trên overlay (chỉ hiển thị) – tính ở overlay/windowBoxes.ts.
import { useT } from '../../i18n';
import type { WindowBox } from '../../overlay/windowBoxes';
import type { Rect } from '../../types';

// focus: id node đang xem riêng – khung node khác mờ đi; selected: node đang chọn – viền đậm.
export function WindowBoxes({ boxes, toClientRect, focus, selected }: {
  boxes: WindowBox[]; toClientRect: (r: Rect) => Rect; focus: string | null; selected: string | null;
}) {
  const t = useT();
  return boxes.map((b) => {
    const c = toClientRect(b.rect);
    const on = b.id === (focus ?? selected);
    return (
      <div key={b.id} aria-hidden className={`pointer-events-none absolute rounded-[6px] border-2 border-dashed border-accent bg-accent/10 ${focus && !on ? 'opacity-20' : ''} ${on ? 'border-solid' : ''}`}
        style={{ left: c.x, top: c.y, width: c.w, height: c.h }}>
        <span className="absolute left-2 top-2 max-w-[calc(100%-16px)] truncate rounded-md bg-hud px-2 py-1 font-mono text-[12px] text-hud-text shadow">
          🪟 {b.ref} · {b.who} → {b.rect.w} × {b.rect.h} {t('wbx.at')} {b.rect.x}, {b.rect.y}
          {b.guess && <span className="opacity-70"> · {t('wbx.guess')}</span>}
        </span>
      </div>
    );
  });
}
