// Thanh tiêu đề tự vẽ kiểu Windows 11 (cửa sổ frameless, bước 63): truy cập nhanh (Lưu / Hoàn tác / Làm lại) bên trái, tên kịch bản
// + chip "Chưa lưu" ở giữa, Hướng dẫn, Cài đặt và nút thu nhỏ / phóng to / đóng bên phải. Cả hàng kéo được cửa sổ.
// Chỉ hiển thị – dữ liệu và hàm xử lý do MainScreen / màn mẫu truyền vào.
import { Quit, WindowMinimise, WindowToggleMaximise } from '../../wailsjs/runtime/runtime';
import { inWails } from '../windowMode';
import { Logo } from './icons';
import { RibbonIcon, RibbonIconName } from './ribbon/ribbonIcons';
import Guide from './guide/Guide';
import { openGuide } from '../guideNav';

const winBase = 'grid h-9 w-11 place-items-center text-ink';
const winBtn = `${winBase} hover:bg-hover`;
// Nút đóng: nền đỏ khi rê chuột (không gộp với hover:bg-hover – hai class hover cùng lúc thì bg-hover thắng)
const closeBtn = `${winBase} hover:bg-danger hover:text-white`;
const quick = 'grid h-7 min-w-7 place-items-center rounded-md text-muted enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-40';

export type TitleBarProps = {
  name: string;
  nameTitle?: string;
  unsaved?: boolean;
  unsavedTitle?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  modKey?: string; // "Ctrl+" / "⌘" cho tooltip
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSettings?: () => void;
};

export default function TitleBar({ name, nameTitle, unsaved, unsavedTitle, canUndo, canRedo, modKey = 'Ctrl+', onSave, onUndo, onRedo, onSettings }: TitleBarProps) {
  const qa = (icon: RibbonIconName, label: string, on?: () => void, off?: boolean) => (
    <button onClick={on} disabled={off || !on} aria-label={label} title={label} className={quick}><RibbonIcon name={icon} /></button>
  );
  return (
    // double click vùng kéo = phóng to / thu về, giống cửa sổ thường. Sự kiện từ modal / popup con cũng nổi lên đây
    // → chỉ nhận khi chỗ bấm thật sự là vùng kéo (cùng biến CSS Wails dùng).
    <div className="drag relative flex h-9 flex-none items-center bg-chrome pl-3"
      onDoubleClick={(e) => inWails && isDragArea(e.target as HTMLElement) && WindowToggleMaximise()}>
      <Logo className="mr-2 h-[15px] w-[15px] flex-none" />
      <div className="mr-1.5 flex gap-px border-r border-line pr-2">
        {qa('save', `Lưu (${modKey}S)`, onSave)}
        {qa('undo', `Hoàn tác (${modKey}Z)`, onUndo, !canUndo)}
        {qa('redo', `Làm lại (${modKey}Y)`, onRedo, !canRedo)}
      </div>
      {/* tên nằm giữa cửa sổ, nhường chỗ cho cụm nút hai bên khi hẹp (truncate) */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center px-[22%]">
        <span className="pointer-events-auto flex min-w-0 items-center gap-2 font-semibold" title={nameTitle ?? 'Kịch bản'}>
          <span className="truncate">{name}</span>
          {unsaved && (
            <span title={unsavedTitle} className="flex h-5 flex-none items-center gap-1.5 rounded-full bg-soft px-2 text-[11.5px] font-normal text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />Chưa lưu
            </span>
          )}
        </span>
      </div>
      <div className="ml-auto flex items-center">
        <button onClick={() => openGuide()} aria-label="Hướng dẫn" title="Hướng dẫn (F1)" className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink"><RibbonIcon name="help" /></button>
        <Guide />
        <button onClick={onSettings} disabled={!onSettings} aria-label="Cài đặt" title={`Cài đặt (${modKey},)`}
          className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink"><RibbonIcon name="gear" /></button>
        {inWails && (
          <>
            <button aria-label="Thu nhỏ" onClick={WindowMinimise} className={winBtn}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0 5h10" stroke="currentColor" /></svg>
            </button>
            <button aria-label="Phóng to" onClick={WindowToggleMaximise} className={winBtn}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><rect x=".5" y=".5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" /></svg>
            </button>
            <button aria-label="Đóng" onClick={Quit} className={closeBtn}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function isDragArea(el: HTMLElement) {
  return getComputedStyle(el).getPropertyValue('--wails-draggable').trim() === 'drag';
}
