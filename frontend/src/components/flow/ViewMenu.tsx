// Nút "Xem" trên dòng đầu canvas của màn mẫu #demo-data (bước 60): kiểu thẻ Gọn / Đầy đủ và cách mở chi tiết node. App thật dùng tab Xem của ribbon (63). Chỉ hiển thị – giá trị qua props.
import { useT } from '../../i18n';
import Segmented from '../Segmented';
import { usePopover } from '../usePopover';
import { Eye } from '../icons';
import { headerBtn, headerLabel } from './FlowHeader';
import type { CardMode } from './model';
import type { DetailMode } from '../../flowPrefs';

export default function ViewMenu({ card, detail, onCard, onDetail }: {
  card: CardMode; detail: DetailMode; onCard: (m: CardMode) => void; onDetail: (m: DetailMode) => void;
}) {
  const t = useT();
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label={t('fl.vm.view')} className={headerBtn}
        title={t('fl.vm.tip')}>
        <Eye className="h-3.5 w-3.5 text-muted" /><span className={headerLabel}>{t('fl.vm.btn')}</span> <span className="text-muted">{card === 'full' ? t('fl.vm.full') : t('fl.vm.compact')}</span>
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-muted" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="dialog" aria-label={t('fl.vm.canvas')} className="absolute right-0 top-[38px] z-30 flex w-[300px] flex-col gap-3 rounded-[10px] border border-line bg-surface p-3 shadow-[0_12px_32px_rgb(0_0_0/.14)]">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{t('fl.vm.card')}</span>
            <Segmented label={t('fl.vm.cardL')} full value={card} onChange={onCard}
              options={[{ id: 'compact', label: t('fl.vm.compact') }, { id: 'full', label: t('fl.vm.fullOpt') }]} />
            <span className="text-xs text-faint">{t('fl.vm.hint')}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{t('fl.vm.detail')}</span>
            <Segmented label={t('fl.vm.detailL')} full value={detail} onChange={onDetail}
              options={[{ id: 'panel', label: 'Panel' }, { id: 'modal', label: 'Modal' }, { id: 'pop', label: 'Popover' }]} />
          </div>
        </div>
      )}
    </div>
  );
}
