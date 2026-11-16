// Công tắc "chỉ thao tác trong cửa sổ này" cho node chuột / phím (46 C2): sai cửa sổ → node lỗi window_mismatch, chưa bấm / gõ gì.
import { useT } from '../../i18n';
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { WIN_MATCHES } from '../../flow/window';
import { Step } from '../../types';
import { Field, hint, SwitchField, useNodeVars } from './shared';

export default function WindowGuardField({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }), rows: 1, compact: true } as const;
  return (
    <>
      <SwitchField label={t('wg.only')} on={!!s.onlyInWindow} onChange={(v) => set({ onlyInWindow: v || undefined })}
        help={t('wg.onlyHelp')} />
      {s.onlyInWindow && (
        <>
          <Field label={t('ap.app')} wide group help={t('wg.appHelp')}>
            <VarTextInput {...varProps} value={s.winApp ?? ''} onChange={(v) => set({ winApp: v || undefined })} placeholder={t('wg.appPh')} />
          </Field>
          <Field label={t('wf.title')} wide group help={t('wf.titlePh')}>
            <VarTextInput {...varProps} value={s.winTitle ?? ''} onChange={(v) => set({ winTitle: v || undefined })} placeholder={t('wf.titlePh')} />
          </Field>
          <Field label={t('ap.match')} wide group>
            <Segmented value={s.winMatch ?? ''} full label={t('ap.match')} onChange={(v) => set({ winMatch: v || undefined })} options={WIN_MATCHES} />
          </Field>
          {!s.winApp?.trim() && !s.winTitle?.trim() && <span className={`col-span-2 -mt-1 ${hint}`}>{t('wg.none')}</span>}
        </>
      )}
    </>
  );
}
