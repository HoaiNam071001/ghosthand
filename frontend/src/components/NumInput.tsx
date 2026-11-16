import { useT } from '../i18n';
import { ReactNode, useEffect, useState } from 'react';

// Ô nhập design v3 (FieldKit): cao 34, nền field, viền line (rê: line-strong), focus viền gradient (ring-focus).
// group/field: nút ⋯ (FieldMenu) bên trong chỉ hiện khi rê / focus vào ô.
export const fieldBox = 'group/field flex h-[34px] items-center rounded-control border border-line bg-field px-2.5 hover:border-line-strong focus-within:ring-focus';
// Trường đã ghim làm input: viền nét đứt accent
const pinnedBox = 'group/field flex h-[34px] items-center rounded-control border border-dashed border-accent bg-field px-2.5';

// Ô số nguyên ≥ min (signed: cho phép số âm, vd độ lệch ΔX). Giữ bản nháp khi đang gõ (cho phép xoá trắng), chỉ ghi vào store khi hợp lệ;
// rời ô thì hiện lại giá trị thật. scale > 1: hiện value / scale, cho gõ số lẻ (vd neo % lưu theo 1/10000, scale 100 → 33.33%).
// stepper: số nguyên nhỏ – nút − / + hai đầu. tag: chữ nhỏ sau số (vd "mặc định" khi đã ghim). menu: nút ⋯ trong ô.
export default function NumInput({ value, onChange, min = 0, unit, prefix, className = '', signed = false, pinned = false, scale = 1, stepper = false, tag, menu }: {
  value: number; onChange: (v: number) => void; min?: number; unit?: string; prefix?: string; className?: string;
  signed?: boolean; pinned?: boolean; scale?: number; stepper?: boolean; tag?: string; menu?: ReactNode;
}) {
  const t = useT();
  const fmt = (v: number) => (Object.is(v, -0) ? '-0' : String(scale === 1 ? v : Number((v / scale).toFixed(2))));
  const valid = scale === 1 ? (signed ? /^-?\d+$/ : /^\d+$/) : (signed ? /^-?\d+([.,]\d*)?$/ : /^\d+([.,]\d*)?$/);
  const [draft, setDraft] = useState(fmt(value));
  useEffect(() => setDraft(fmt(value)), [value, scale]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = (d: number) => onChange(signed ? value + d : Math.max(min, value + d));
  const stepBtn = 'grid h-full w-[34px] flex-none place-items-center text-base text-muted hover:bg-hover hover:text-ink';
  return (
    <span className={`${pinned ? pinnedBox : fieldBox} gap-1.5 text-muted ${stepper ? 'overflow-hidden px-0' : ''} ${menu ? 'pr-1' : ''} ${className}`}>
      {stepper && <button type="button" aria-label={t('ni.less')} onClick={() => step(-1)} className={`${stepBtn} border-r border-line`}>−</button>}
      {prefix && <span>{prefix}</span>}
      <input inputMode="numeric" value={draft} className={`w-full min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none ${stepper ? 'text-center' : ''}`}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (!valid.test(v)) return;
          const n = Math.round(Number(v.replace(',', '.')) * scale);
          onChange(signed ? n : Math.max(min, n));
        }}
        onBlur={() => setDraft(fmt(value))} />
      {tag && <span className="flex-none text-[11.5px]">{tag}</span>}
      {unit && <span className="flex-none text-xs">{unit}</span>}
      {stepper && <button type="button" aria-label={t('ni.more')} onClick={() => step(1)} className={`${stepBtn} border-l border-line`}>+</button>}
      {menu}
    </span>
  );
}
