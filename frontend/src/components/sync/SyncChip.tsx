// Chấm trạng thái đồng bộ trên thanh dưới (bước 54 C8): chỉ hiện khi đã đăng nhập. Bấm → mở Cài đặt → Đồng bộ.
import { syncTone, TONE_CLASS } from '../../sync/text';
import type { SyncStatus } from '../../sync/types';

export default function SyncChip({ status, onClick }: { status: SyncStatus; onClick: () => void }) {
  if (!status.loggedIn) return null;
  const { tone, text } = syncTone(status);
  return (
    <button onClick={onClick} title={`${text} – bấm để mở Cài đặt → Đồng bộ`} aria-label={`Đồng bộ: ${text}`}
      className={`flex items-center gap-1.5 hover:text-ink ${TONE_CLASS[tone]}`}>
      <span className={`h-[7px] w-[7px] rounded-full bg-current ${tone === 'busy' ? 'animate-pulse' : ''}`} />
      <span className="text-muted">Đồng bộ</span>
    </button>
  );
}
