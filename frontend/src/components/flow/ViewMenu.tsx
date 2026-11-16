// Nút "Xem" trên dòng đầu canvas của màn mẫu #demo-data (bước 60): kiểu thẻ Gọn / Đầy đủ và cách mở chi tiết node. App thật dùng tab Xem của ribbon (63). Chỉ hiển thị – giá trị qua props.
import Segmented from '../Segmented';
import { usePopover } from '../usePopover';
import { Eye } from '../icons';
import { headerBtn, headerLabel } from './FlowHeader';
import type { CardMode } from './model';
import type { DetailMode } from '../../flowPrefs';

export default function ViewMenu({ card, detail, onCard, onDetail }: {
  card: CardMode; detail: DetailMode; onCard: (m: CardMode) => void; onDetail: (m: DetailMode) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label="Kiểu xem" className={headerBtn}
        title="Kiểu thẻ node (Gọn / Đầy đủ có VÀO – RA) và cách mở chi tiết node">
        <Eye className="h-3.5 w-3.5 text-muted" /><span className={headerLabel}>Xem</span> <span className="text-muted">{card === 'full' ? 'Đầy đủ' : 'Gọn'}</span>
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-muted" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="dialog" aria-label="Kiểu xem canvas" className="absolute right-0 top-[38px] z-30 flex w-[300px] flex-col gap-3 rounded-[10px] border border-line bg-surface p-3 shadow-[0_12px_32px_rgb(0_0_0/.14)]">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Thẻ node</span>
            <Segmented label="Kiểu thẻ node" full value={card} onChange={onCard}
              options={[{ id: 'compact', label: 'Gọn' }, { id: 'full', label: 'Đầy đủ (VÀO / RA)' }]} />
            <span className="text-xs text-faint">Gọn: rê chuột lên thẻ một lúc để toả cổng dữ liệu. Kéo ô vuông output sang ô VÀO của node chạy sau để nối.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Chi tiết node</span>
            <Segmented label="Cách mở chi tiết node" full value={detail} onChange={onDetail}
              options={[{ id: 'panel', label: 'Panel' }, { id: 'modal', label: 'Modal' }, { id: 'pop', label: 'Popover' }]} />
          </div>
        </div>
      )}
    </div>
  );
}
