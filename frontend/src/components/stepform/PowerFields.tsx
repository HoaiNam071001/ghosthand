// Node Nguồn (bước 43 S3): hành động + đếm ngược. Hành động mất phiên làm việc hỏi đồng ý lúc bấm Chạy.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import Select from '../Select';
import { updateStep } from '../../store';
import { POWER_COUNTDOWN_SEC, POWER_OPS, powerNeedsConsent, type PowerOp } from '../../flow/power';
import { Step } from '../../types';
import { Field, hint, selectBox } from './shared';

export default function PowerFields({ step: s }: { step: Step }) {
  const t = useT();
  const op: PowerOp = s.powerOp ?? 'lock';
  const danger = powerNeedsConsent(op);
  return (
    <>
      <Field label={t('ap.do')} wide group>
        <Select value={op} onChange={(v) => updateStep(s.id, { powerOp: v as PowerOp })} className={selectBox} aria-label={t('pw.label')}
          options={POWER_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      <Field label={t('pw.countdown')} help={danger ? t('pw.cdHelp', { n: POWER_COUNTDOWN_SEC }) : t('pw.cdOpt')}>
        <NumInput value={s.countdownSec ?? 0} unit={t('pw.sec')} min={0} onChange={(countdownSec) => updateStep(s.id, { countdownSec })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {danger
          ? t('pw.noteDanger')
          : op === 'lock' ? t('pw.noteLock') : t('pw.noteDisplay')}
        {' '}{t('pw.awake')}
      </span>
    </>
  );
}
