// Node Chờ đến giờ (bước 35 N6): giờ hẹn (nhận {{biến}}) + xem trước còn bao lâu, giờ đã qua thì làm gì, canh giờ chuẩn.
import { useT } from '../../i18n';
import { useEffect, useState } from 'react';
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { PASSED_MODES, untilText, type IfPassed } from '../../flow/waitUntil';
import { Step } from '../../types';
import { Field, SwitchField, useNodeVars } from './shared';

export function WaitUntilFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 500);
    return () => clearInterval(t);
  }, []);
  const preview = untilText(s, now);
  return (
    <>
      <Field label={t('wut.at')} wide group help={t('wut.atHelp')}>
        <VarTextInput inputs={script.inputs ?? []} nodeVars={nodeVars} rows={1} compact value={s.at ?? ''} onChange={(at) => set({ at })}
          onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} placeholder="20:00:00.000" />
        <span className={`text-xs ${preview?.bad ? 'text-danger-text' : 'text-muted'}`}>
          {preview ? preview.text : t('wut.var')}
        </span>
      </Field>
      <Field label={t('wut.passed')} wide group help={t(s.ifPassed === 'tomorrow' ? 'wut.hTomorrow' : s.ifPassed === 'fail' ? 'wut.hFail' : 'wut.hGo')}>
        <Segmented value={s.ifPassed ?? ''} options={PASSED_MODES} onChange={(v: IfPassed) => set({ ifPassed: v || undefined })} full label={t('wut.passed')} />
      </Field>
      <SwitchField label={t('wu2.ntp')} help={t('wut.ntpHelp')}
        on={!!s.useNtp} onChange={(on) => set({ useNtp: on || undefined })} />
    </>
  );
}
