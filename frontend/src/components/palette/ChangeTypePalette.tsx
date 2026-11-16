// Đổi loại node từ inspector: cùng bảng với Thêm node (có hoạt hoạ minh hoạ) nhưng chỉ các loại node thuần và bấm là đổi node đang chọn.
import { useT } from '../../i18n';
import { useMemo } from 'react';
import { PaletteView } from '../PaletteView';
import { GROUPS } from './groups';
import { changeStepType } from '../../store';
import type { Step } from '../../types';

export default function ChangeTypePalette({ step, onClose }: { step: Step; onClose: () => void }) {
  const t = useT();
  const groups = useMemo(() => GROUPS
    .map((g) => ({
      ...g, note: undefined,
      items: g.items.filter((it) => it.type).map((it) => ({ ...it, run: () => changeStepType(step.id, it.type!) })),
    }))
    .filter((g) => g.items.length > 0), [step.id]);
  return (
    <PaletteView groups={groups} onClose={onClose} label={t('ct.title')}
      context={<>{t('ct.ctxA')} <span className="font-mono">{step.ref}</span> {t('ct.ctxB')}</>}
      footer={<span><span className="font-mono">Enter</span> {t('ct.enter')}</span>} />
  );
}
