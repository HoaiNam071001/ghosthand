// Thanh mini khi đang ghi macro (bước 24) – chỉ hiển thị; dùng chung với #demo-minibar.
import { Stop } from '../icons';

export function RecordBarView({ elapsed, onStop }: { elapsed: string; onStop: () => void }) {
  return (
    <div className="drag flex h-[96px] w-[540px] items-center gap-3.5 overflow-hidden rounded-hud border border-line bg-surface pr-3.5 pl-4 text-ink">
      <span className="grid h-[50px] w-[50px] flex-none place-items-center rounded-full bg-soft">
        <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-danger" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate font-semibold">Đang ghi thao tác</span>
        <span className="font-mono text-xs text-muted">{elapsed}   chuột / phím của bạn được ghi lại</span>
      </div>
      <button onClick={onStop} className="btn-danger-soft flex h-11 items-center gap-2 rounded-[9px] px-3.5 font-semibold">
        <Stop className="h-2.5 w-2.5" />Dừng ghi <span className="font-mono text-[11px] font-normal opacity-75">F9</span>
      </button>
    </div>
  );
}
