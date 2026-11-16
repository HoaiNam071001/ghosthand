// Node Thao tác phần tử (bước 43 E1): tìm phần tử + chọn thao tác (bấm / đặt giá trị / tick…) không dùng chuột.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { ELEMENT_ACTS, type ElementAct } from '../../flow/elementAction';
import { Step } from '../../types';
import { fmtSec, Field, hint, NumField, selectBox, useNodeVars } from './shared';
import { ElementQueryFields } from './ElementFields';

export default function ElementActionFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const act = (s.elementAct || 'press') as ElementAct;
  return (
    <>
      <ElementQueryFields step={s} />
      <Field label={t('ap.do')} help={t('ea.help')}>
        <Select value={act as string} onChange={(v) => updateStep(s.id, { elementAct: v === 'press' ? undefined : (v as ElementAct) })} className={selectBox} aria-label={t('ea.op')}
          options={ELEMENT_ACTS.map((o) => ({ value: o.id as string, label: o.label }))} />
      </Field>
      {act === 'setValue' && (
        <Field label={t('ea.value')} wide group help={t('ea.valueHelp')}>
          <VarTextInput value={s.text} onChange={(text) => updateStep(s.id, { text })} inputs={script.inputs ?? []} nodeVars={nodeVars}
            onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} rows={1} compact placeholder={t('ea.valuePh')} />
        </Field>
      )}
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('ea.note', { t: fmtSec(s.timeoutMs) })} {t('pf.later')} {`{{${s.ref}.output.value}}`}.
      </span>
    </>
  );
}
