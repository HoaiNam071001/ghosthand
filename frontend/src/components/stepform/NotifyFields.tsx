// Node Thông báo hệ thống (bước 43 S9): tiêu đề + nội dung.
import { useT } from '../../i18n';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { Field, hint, useNodeVars } from './shared';

export default function NotifyFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <Field label={t('wf.title')} wide group help={t('nf.titleHelp')}>
        <VarTextInput {...varProps} rows={1} compact value={s.notifyTitle ?? ''} onChange={(v) => updateStep(s.id, { notifyTitle: v || undefined })} placeholder="Ghosthand" />
      </Field>
      <Field label={t('cl.content')} wide group>
        <VarTextInput {...varProps} rows={3} value={s.text ?? ''} onChange={(v) => updateStep(s.id, { text: v })} placeholder={t('nf.ph')} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('nf.note')}
      </span>
    </>
  );
}
