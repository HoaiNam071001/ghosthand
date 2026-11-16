// Node Đọc chữ vùng (bước 28 R1): vùng (như Chụp màn hình), thời gian chờ có chữ.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { Field, fmtSec, hint, NumField } from './shared';
import { ShotAreaField } from './ShotFields';

export function OcrReadFields({ step: s }: { step: Step }) {
  const t = useT();
  return (
    <>
      <ShotAreaField step={s} label={t('or.area')} />
      <NumField label={t('common.maxWait')} info={t('or.waitInfo', { t: fmtSec(s.timeoutMs) })} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('or.every')}>
        <NumInput value={s.intervalMs ?? 300} min={50} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('or.note1')} <b>{t('or.nodeSpot')}</b> {t('or.note2')} {t('pf.later')} {`{{${s.ref}.output.text}}`} {t('or.note3')}
      </span>
    </>
  );
}
