// Node Hỏi người dùng (bước 56 D1): câu hỏi, danh sách mục kèm theo, ô nhập tuỳ chọn, chờ tối đa.
import { useT } from '../../i18n';
import VarTextInput from '../inputs/VarTextInput';
import { Switch } from '../Switch';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { Field, hint, NumField, useNodeVars } from './shared';

export default function AskUserFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <Field label={t('aa.q')} wide group>
        <VarTextInput {...varProps} rows={2} value={s.message ?? ''} onChange={(v) => updateStep(s.id, { message: v })} placeholder={t('au.qPh')} />
      </Field>
      <Field label={t('au.items')} wide group help={t('au.itemsHelp')}>
        <VarTextInput {...varProps} rows={3} value={s.askItems ?? ''} onChange={(v) => updateStep(s.id, { askItems: v || undefined })} placeholder="{{n2.output.text}}" />
      </Field>
      <Field label={t('au.input')} help={t('au.inputHelp')}>
        <Switch on={!!s.askInput} onChange={() => updateStep(s.id, { askInput: !s.askInput || undefined })} label={t('au.input')} />
      </Field>
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('au.note')}
      </span>
    </>
  );
}
