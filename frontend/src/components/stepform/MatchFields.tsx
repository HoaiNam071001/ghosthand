// Cách so ảnh mẫu + kiểm tra màu (bước 40) – chỉ hiển thị, dùng chung cho node Chờ / Click theo ảnh và điều kiện thấy ảnh.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import { Switch } from '../Switch';
import { MatchMode } from '../../types';
import { Field } from './shared';

// Mức lệch màu mặc định khi bật: nút xám / xanh cùng hình lệch ~30%, cùng nút khác theme sáng nhẹ lệch vài %.
export const DEFAULT_COLOR_TOL = 15;

export type MatchValue = { matchMode?: MatchMode; colorTol?: number };

export default function MatchFields({ value: v, onChange }: { value: MatchValue; onChange: (patch: MatchValue) => void }) {
  const t = useT();
  const colorOn = (v.colorTol ?? 0) > 0;
  return (
    <>
      <Field label={t('mt.by')} wide group
        help={t('mt.byHelp')}>
        <Segmented value={v.matchMode || 'gray'} full label={t('mt.by')}
          onChange={(m) => onChange({ matchMode: m === 'edge' ? 'edge' : undefined })}
          options={[{ id: 'gray', label: t('mt.gray') }, { id: 'edge', label: t('mt.edge') }]} />
      </Field>
      <Field label={t('mt.color')} group
        help={t('mt.colorHelp')}>
        <Switch on={colorOn} label={t('mt.color')} onChange={(on) => onChange({ colorTol: on ? DEFAULT_COLOR_TOL : undefined })} />
      </Field>
      {colorOn && (
        <Field label={t('mt.tol')} help={t('mt.tolHelp')}>
          <NumInput value={v.colorTol ?? DEFAULT_COLOR_TOL} min={1} unit="%" onChange={(colorTol) => onChange({ colorTol: Math.min(colorTol, 100) })} />
        </Field>
      )}
    </>
  );
}
