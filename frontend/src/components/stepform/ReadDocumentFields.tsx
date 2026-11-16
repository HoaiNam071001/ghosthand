// Node Đọc tài liệu (bước 43 E3): ô soạn thảo (tự chọn | theo selector) + chỉ phần đang chọn.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { fmtSec, Field, hint, NumField, SwitchField } from './shared';
import { ElementQueryFields } from './ElementFields';

export default function ReadDocumentFields({ step: s }: { step: Step }) {
  const t = useT();
  return (
    <>
      <ElementQueryFields step={s} optional />
      <SwitchField label={t('rd.sel')} help={t('rd.selHelp')}
        on={!!s.selectionOnly} onChange={(selectionOnly) => updateStep(s.id, { selectionOnly: selectionOnly || undefined })} />
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('rd.note1')} {t('pf.later')} {`{{${s.ref}.output.text}}`}.
        {t('rd.note2', { t: fmtSec(s.timeoutMs) })}
      </span>
    </>
  );
}
