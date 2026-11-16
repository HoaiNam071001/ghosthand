// Node Bộ gõ (bước 43 S6): đọc hoặc đổi bộ gõ của hệ điều hành.
import { useT } from '../../i18n';
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { IME_DEFAULT_HOTKEY, INPUT_OPS, type InputOp } from '../../flow/inputSource';
import { Step } from '../../types';
import { Field, hint, useNodeVars } from './shared';

export default function InputSourceFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <Field label={t('ap.do')} wide group>
        <Segmented value={s.inputOp ?? ''} full label={t('is.op')} onChange={(v) => set({ inputOp: (v || undefined) as InputOp | undefined })} options={INPUT_OPS} />
      </Field>
      {s.inputOp === 'set' && (
        <Field label={t('is.layout')} wide group help={t('is.layoutHelp')}>
          <VarTextInput {...varProps} value={s.inputLayout ?? ''} onChange={(v) => set({ inputLayout: v || undefined })} placeholder="ABC" />
        </Field>
      )}
      {s.inputOp === 'toggleIME' && (
        <Field label={t('is.hotkey')} wide group help={t('is.hotkeyHelp')}>
          <VarTextInput {...varProps} value={s.inputHotkey ?? ''} onChange={(v) => set({ inputHotkey: v || undefined })} placeholder={IME_DEFAULT_HOTKEY} />
        </Field>
      )}
      {s.inputOp === 'toggleIME' && (
        <span className={`col-span-2 -mt-1 ${hint}`}>
          {t('is.toggleNote')}
        </span>
      )}
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('is.before')} {t('pf.later')} {`{{${s.ref}.output.name}}`}, {`{{${s.ref}.output.vietnamese}}`}, {`{{${s.ref}.output.imeApp}}`} {t('is.imeApp')}
      </span>
    </>
  );
}
