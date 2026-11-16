// Thao tác giống người (bước 34) – chỉ hiển thị: mức của kịch bản (Cài đặt chạy) và ô ghi đè của node (inspector).
import { useT } from '../i18n';
import Select from './Select';
import { fieldBox } from './NumInput';
import Segmented from './Segmented';
import { HUMAN_LEVELS, humanHint, humanLabel, scriptHuman } from '../flow/human';
import type { HumanLevel } from '../types';
import { Field } from './stepform/shared';

const hintCls = 'text-xs text-muted';

export function HumanScriptField({ value, onChange }: { value?: HumanLevel; onChange: (lv: HumanLevel) => void }) {
  const t = useT();
  const lv = scriptHuman(value);
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col">{t('hm.script')}
        <span className={hintCls}>{t('hm.scriptHint')}</span>
      </span>
      <Segmented value={lv} options={HUMAN_LEVELS} onChange={onChange} label={t('hm.script')} full />
      <span className={hintCls}>{humanHint(lv)}</span>
    </div>
  );
}

// Ô ghi đè của node (hàng inspector v3): trống = theo kịch bản (hiện mức đang dùng); giải thích mức trong ⓘ.
export function HumanNodeField({ value, scriptLevel, onChange }: {
  value?: HumanLevel; scriptLevel?: HumanLevel; onChange: (lv: HumanLevel | undefined) => void;
}) {
  const t = useT();
  return (
    <Field label={t('hm.node')} help={humanHint(value ?? scriptHuman(scriptLevel))}>
      <Select value={value ?? ''} onChange={(v) => onChange((v || undefined) as HumanLevel | undefined)} className={`${fieldBox} text-ink`} aria-label={t('hm.level')}
        options={[{ value: '', label: t('hm.follow', { v: humanLabel(scriptHuman(scriptLevel)) }) }, ...HUMAN_LEVELS.map((l) => ({ value: l.id as string, label: l.label }))]} />
    </Field>
  );
}
