// Bảng thêm bước (design v2, artboard AddStep) – mở bằng "+ Thêm bước" hoặc Ctrl/Cmd+K.
// Danh sách nhóm / loại node + nối store; phần hiển thị ở PaletteView. Node mới nối theo chỗ đã đặt (store insertAt).
import { useT } from '../i18n';
import { PaletteView } from './PaletteView';
import { GROUPS } from './palette/groups';
import { customGroup, useCustomNodes } from './palette/customGroup';
import { getEditor, insertTarget } from '../store';
import { portView } from '../flow/view';
import { openGuide } from '../guideNav';

// onCancel: đóng mà không chọn (Esc, bấm ra ngoài) – bỏ chỗ nối đã đặt (store insertAt).
export default function AddStepPalette({ onClose, onCancel }: { onClose: () => void; onCancel?: () => void }) {
  const t = useT();
  const { list, reload } = useCustomNodes();
  const mine = customGroup(list, reload);
  const at = insertTarget();
  const from = at && getEditor().script.steps.find((s) => s.id === at.from);
  return (
    <PaletteView groups={mine ? [...GROUPS, mine] : GROUPS} onClose={onClose} onCancel={onCancel} onGuide={(node) => openGuide({ node })}
      context={from ? <>{t('pl.from')} <span className="font-mono">{from.ref}</span> · {t('pl.port')} {portView(at.port, from).label}</> : t('pl.alone')}
      footer={<><span><span className="font-mono">Enter</span> {t('pl.enter')}</span><span className="ml-auto">{t('pl.hint')}</span></>} />
  );
}
