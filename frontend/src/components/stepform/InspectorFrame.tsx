// Khung bảng chi tiết node theo kiểu mở (bước 60): Panel (nổi trên canvas hoặc ghim cạnh phải – bước 63; kéo mép trái đổi rộng),
// Modal giữa màn, Popover dưới node. Nội dung giống nhau – StepForm truyền vào. Esc đóng (trừ khi đang gõ); Modal bấm nền mờ cũng đóng.
// Popover: chiều cao tối đa do khung NodePopover đặt (theo chỗ trống trong canvas).
// Panel nổi dùng position absolute → đặt trong khung `relative` bọc canvas (MainScreen).
import { ReactNode, useEffect } from 'react';
import { ResizeHandle, usePanelWidth } from '../PanelResize';
import { useShell } from '../../shellStore';
import type { DetailMode } from '../../flowPrefs';

const body = 'flex flex-col gap-3 overflow-y-auto bg-surface p-3.5';

export default function InspectorFrame({ mode, label, onClose, children }: { mode: DetailMode; label: string; onClose?: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && !(e.target as HTMLElement).closest?.('input, textarea, select, [aria-expanded=true], [role=listbox], [role=menu]') && onClose(); // Esc đang đóng ô chọn / menu thì không đóng cả bảng
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-black/25 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
        <aside role="dialog" aria-label={label} className={`${body} max-h-[86vh] w-[460px] max-w-full rounded-panel border border-line shadow-[0_16px_48px_rgb(0_0_0/.22)]`}>{children}</aside>
      </div>
    );
  }
  if (mode === 'pop') {
    return (
      <aside role="dialog" aria-label={label}
        className={`${body} nodrag nowheel nopan max-h-[inherit] w-[360px] rounded-[12px] border border-line text-[13px] shadow-[0_12px_32px_rgb(0_0_0/.2)]`}>{children}</aside>
    );
  }
  return <Panel label={label}>{children}</Panel>;
}

function Panel({ label, children }: { label: string; children: ReactNode }) {
  const { inspectorPinned: pinned } = useShell();
  const size = usePanelWidth('inspector-width', 340, 300, 640);
  return (
    <div className={pinned ? 'relative flex flex-none' : 'absolute top-2.5 right-2.5 bottom-2.5 z-20 flex max-w-[calc(100%-20px)] shadow-[0_12px_40px_rgb(0_0_0/.28)] rounded-[12px]'}>
      <ResizeHandle edge="left" width={size.width} onWidth={size.setWidth} onReset={size.reset} label="Bề rộng bảng thuộc tính node" />
      <aside aria-label={label} style={{ width: size.width }} className={`${body} max-w-full ${pinned ? 'border-l border-line' : 'rounded-[12px] border border-line'}`}>{children}</aside>
    </div>
  );
}
