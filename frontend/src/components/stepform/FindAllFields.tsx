// Node Tìm tất cả (bước 42 G3): cùng ô tìm như Chờ ảnh / chữ / phần tử (ImageSearchFields) + số chỗ cần thấy.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { countRange } from '../../flow/findAll';
import { Step } from '../../types';
import { Field, hint } from './shared';
import { ImageSearchFields } from './ImageFields';

export function FindAllFields({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return (
    <>
      <ImageSearchFields step={s} />
      <Field label={t('fa.count')} wide group
        help={t('fa.countHelp')}>
        <div className="flex gap-2">
          <NumInput prefix={t('fa.min')} value={Math.max(s.minCount ?? 0, 1)} min={1} onChange={(n) => set({ minCount: n })} className="flex-1" />
          <NumInput prefix={t('fa.max')} value={s.maxCount ?? 0} onChange={(n) => set({ maxCount: n || undefined })} className="flex-1" />
        </div>
        <span className={hint}>
          {t('fa.note', { range: countRange(s) })} {`{{${s.ref}.output.items}}`}{t('fa.note2')}
        </span>
      </Field>
    </>
  );
}

