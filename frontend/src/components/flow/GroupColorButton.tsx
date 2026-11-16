// Nút chọn màu khung nhóm (bước 39): chấm màu hiện tại, bấm mở hàng 7 màu nhóm node + bỏ màu.
import { useT } from '../../i18n';
import { useState } from 'react';
import { GROUP_COLORS, groupColor } from '../../flow/groups';

export function GroupColorButton({ color, onPick }: { color?: string; onPick: (c: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const cur = groupColor(color);
  return (
    <span className="nodrag relative flex-none">
      <button onClick={() => setOpen(!open)} aria-label={t('fl.grp.color')} title={t('fl.grp.color')} aria-expanded={open}
        className="grid h-5 w-5 place-items-center rounded text-muted hover:bg-hover">
        <span className={`h-2.5 w-2.5 rounded-full border ${cur ? `cat-${cur} border-transparent` : 'border-line-strong'}`}
          style={cur ? { background: 'var(--cat-base)' } : undefined} />
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-10 flex gap-1 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
          {['', ...GROUP_COLORS].map((c) => (
            <button key={c || 'none'} onClick={() => { onPick(c); setOpen(false); }} aria-label={c ? t('fl.grp.colorN', { c }) : t('fl.grp.noColor')}
              className={`h-4 w-4 rounded-full border ${c ? `cat-${c} border-transparent` : 'border-line-strong'} ${c === (cur ?? '') ? 'ring-focus' : ''}`}
              style={c ? { background: 'var(--cat-base)' } : undefined} />
          ))}
        </span>
      )}
    </span>
  );
}
