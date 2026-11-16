// Node Chờ màn hình (bước 42 G1): cách chờ (đứng yên / thay đổi), vùng (như Chụp màn hình), ngưỡng, thời gian.
import { useT } from '../../i18n';
import Segmented from '../Segmented';
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { WAIT_MODES, type WaitMode } from '../../flow/waitScreen';
import { Step } from '../../types';
import { Field, fmtSec, NumField } from './shared';
import { ShotAreaField } from './ShotFields';

export function WaitScreenFields({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const change = s.waitMode === 'change';
  return (
    <>
      <Field label={t('wa.until')} wide group help={t(change ? 'wsf.changeHelp' : 'wsf.stillHelp')}>
        <Segmented value={s.waitMode ?? ''} options={WAIT_MODES} onChange={(v: WaitMode) => set({ waitMode: v || undefined })} full label={t('wa.until')} />
      </Field>
      <ShotAreaField step={s} label={t('wsf.area')} />
      {!change && (
        <Field label={t('wsf.still')} help={t('wsf.stillFor', { t: fmtSec(s.stableMs) })}>
          <NumInput value={s.stableMs ?? 0} unit="ms" onChange={(stableMs) => set({ stableMs })} />
        </Field>
      )}
      <Field label={t('wsf.thr')} help={t('wsf.thrHelp', { rule: t(change ? 'wsf.ruleChange' : 'wsf.ruleStill') })}>
        <NumInput value={s.diffPct ?? 0} unit="%" onChange={(diffPct) => set({ diffPct: Math.min(diffPct, 100) })} />
      </Field>
      <NumField label={t('common.maxWait')} info={t(change ? 'wsf.noChange' : 'wsf.noStill', { t: fmtSec(s.timeoutMs) })} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 200} min={20} unit="ms" onChange={(intervalMs) => set({ intervalMs })} />
      </Field>
    </>
  );
}
