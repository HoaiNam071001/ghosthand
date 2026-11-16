// Node Đọc chữ trang (bước 43 B4): phạm vi (cả cửa sổ | trong một phần tử) + gồm phần ngoài khung nhìn.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { fmtSec, Field, hint, NumField, SwitchField } from './shared';
import { ElementQueryFields } from './ElementFields';

export default function PageTextFields({ step: s }: { step: Step }) {
  const t = useT();
  return (
    <>
      <ElementQueryFields step={s} optional />
      <SwitchField label={t('rt2.all')} help={t('pt.allHelp')}
        on={!!s.pageAll} onChange={(pageAll) => updateStep(s.id, { pageAll: pageAll || undefined })} />
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('pt.note1')} {`{{${s.ref}.output.text}}`} {t('pt.note2')} {`{{${s.ref}.output.lines}}`} {t('pt.note3')}
        {t('pt.note4', { t: fmtSec(s.timeoutMs) })}
      </span>
    </>
  );
}
