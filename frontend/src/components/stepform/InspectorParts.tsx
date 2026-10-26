// Khung inspector design v3 (bước 38) – chỉ hiển thị, dùng chung app (StepForm) và màn mẫu (#demo-flow):
// đầu inspector theo màu nhóm node, khối thu gọn có tóm tắt (Section), nút ⓘ mô tả loại node, nút chữ ở chân.
import { ReactNode, useState } from 'react';
import { Chevron, Info, StepIcon, StepIconName } from '../icons';
import type { NodeCategory } from '../../flow/category';
import type { NodeInfo } from '../../flow/nodeInfo';
import { usePopover } from '../usePopover';

// Mở / đóng của từng khối, nhớ theo loại node trong phiên (chọn node Click khác vẫn mở đúng khối đang xem).
const openState = new Map<string, boolean>();

export function Section({ title, summary, scope, defaultOpen = false, children }: {
  title: string; summary?: ReactNode; scope: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const key = `${scope}|${title}`;
  const [open, setOpen] = useState(() => openState.get(key) ?? defaultOpen);
  const toggle = () => {
    openState.set(key, !open);
    setOpen(!open);
  };
  return (
    <section className="flex-none rounded-[10px] border border-line bg-panel">
      <button onClick={toggle} aria-expanded={open} className="flex h-[38px] w-full items-center gap-2 px-3 text-left">
        <Chevron open={open} className="h-[11px] w-[11px] flex-none text-muted" />
        <span className="flex-none font-semibold">{title}</span>
        {!open && summary && <span className="min-w-0 flex-1 truncate text-right text-xs text-muted">{summary}</span>}
      </button>
      {open && <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>}
    </section>
  );
}

// Đầu inspector: ô icon màu nhóm, tên (ô sửa), dòng phụ (mã node + loại), các nút bên phải.
export function InspectorHead({ cat, icon, name, sub, actions }: {
  cat: NodeCategory; icon: StepIconName; name: ReactNode; sub: ReactNode; actions: ReactNode;
}) {
  return (
    // relative: popup ⓘ trải hết bề ngang dưới phần đầu (đặt theo nút thì bị cắt ở mép inspector)
    <div className={`cat-${cat} relative flex items-center gap-2.5`}>
      <span className="grid h-9 w-9 flex-none place-items-center rounded-[9px] bg-cat-tile text-cat"><StepIcon type={icon} className="h-[18px] w-[18px]" /></span>
      <div className="min-w-0 flex-1">
        {name}
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">{sub}</div>
      </div>
      {actions}
    </div>
  );
}

export const iconBtn = 'grid h-[30px] w-[30px] flex-none place-items-center rounded-control text-muted hover:bg-hover hover:text-ink';

// ⓘ: mô tả loại node (bước 35 N0) trong popup nhỏ thay vì thẻ to cố định trên các trường.
// onGuide: link mở trang node trong modal Hướng dẫn (bước 51).
export function InfoButton({ info, onGuide }: { info: NodeInfo; onGuide?: () => void }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label="Mô tả loại node" aria-expanded={open} title="Mô tả loại node"
        className={`${iconBtn} ${open ? 'bg-hover text-ink' : ''}`}><Info /></button>
      {open && (
        <div role="tooltip" className="absolute inset-x-0 top-full z-30 mt-1.5 flex flex-col gap-1 rounded-[8px] bg-ink px-3 py-2.5 text-[12.5px] leading-snug text-bg shadow-[0_8px_24px_rgb(0_0_0/.18)]">
          <span>{info.desc}</span>
          <span className="opacity-75"><span className="font-semibold">Dùng khi:</span> {info.use}</span>
          {onGuide && <button onClick={() => { setOpen(false); onGuide(); }} className="self-start font-semibold underline-offset-2 hover:underline">Xem hướng dẫn →</button>}
        </div>
      )}
    </div>
  );
}

// Nút chữ ở chân inspector (Đặt làm bắt đầu, Điểm dừng, Xoá node)
export const footerBtn = 'flex h-[30px] items-center gap-1.5 rounded-control px-2.5 text-[12.5px] enabled:hover:bg-hover disabled:opacity-50';
export const footerRow = 'mt-auto flex flex-wrap gap-1.5 border-t border-line pt-2.5';
