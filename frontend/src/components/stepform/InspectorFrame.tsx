// Khung bảng chi tiết node theo kiểu mở (bước 60): Panel cột phải (kéo mép đổi rộng), Modal giữa màn, Popover dưới node.
// Nội dung giống nhau – StepForm truyền vào. Modal / Popover: Esc đóng; Modal bấm nền mờ cũng đóng.
import { ReactNode, useEffect } from 'react';
import { ResizeHandle, usePanelWidth } from '../PanelResize';
import type { DetailMode } from '../../flowPrefs';

const body = 'flex flex-col gap-3 overflow-y-auto bg-surface p-3.5';

export default function InspectorFrame({ mode, label, onClose, children }: { mode: DetailMode; label: string; onClose?: () => void; children: ReactNode }) {
  useEffect(() => {
    if (mode === 'panel' || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target as HTMLElement).closest?.('input, textarea, select') && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onClose]);
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
        className={`${body} nodrag nowheel nopan max-h-[60vh] w-[360px] rounded-[12px] border border-line text-[13px] shadow-[0_12px_32px_rgb(0_0_0/.2)]`}>{children}</aside>
    );
  }
  return <Panel label={label}>{children}</Panel>;
}

function Panel({ label, children }: { label: string; children: ReactNode }) {
  const size = usePanelWidth('inspector-width', 340, 300, 640);
  return (
    <div className="relative flex flex-none">
      <ResizeHandle edge="left" width={size.width} onWidth={size.setWidth} onReset={size.reset} label="Bề rộng bảng thuộc tính node" />
      <aside aria-label={label} style={{ width: size.width }} className={`${body} border-l border-line`}>{children}</aside>
    </div>
  );
}
