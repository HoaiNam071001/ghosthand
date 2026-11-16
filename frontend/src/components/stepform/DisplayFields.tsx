// Node Màn hình / âm thanh (bước 43 S7): chế độ sáng / tối, độ sáng, loa / micro mặc định, phát âm báo.
import { useT } from '../../i18n';
import type { MsgKey } from '../../i18n/vi';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import Select from '../Select';
import { Switch } from '../Switch';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { DISPLAY_OPS, SYSTEM_SOUNDS, THEMES, type DisplayOp } from '../../flow/display';
import { Step } from '../../types';
import { Field, hint, selectBox, useNodeVars } from './shared';

const OP_HINT: Record<DisplayOp, MsgKey> = {
  '': 'df.h.read', theme: 'df.h.theme', brightness: 'df.h.bright', audioOut: 'df.h.audio', audioIn: 'df.h.audio', sound: 'df.h.sound',
};

export default function DisplayFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const op = s.displayOp ?? '';
  const value = s.displayValue ?? '';
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const text = (placeholder: string) => <VarTextInput {...varProps} value={value} onChange={(v) => set({ displayValue: v || undefined })} placeholder={placeholder} />;
  return (
    <>
      <Field label={t('ap.do')} wide group>
        <Select value={op} onChange={(v) => set({ displayOp: (v || undefined) as DisplayOp | undefined, displayValue: undefined })} className={selectBox} aria-label={t('df.opLabel')}
          options={DISPLAY_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      {op === 'theme' && (
        <Field label={t('df.mode')} wide group>
          <Segmented value={value} full label={t('df.themeLabel')} onChange={(v) => set({ displayValue: v })} options={THEMES} />
        </Field>
      )}
      {op === 'brightness' && (
        <Field label={t('df.bright')} help={t('df.brightHelp')}>
          <NumInput value={Number(value) || 0} unit="%" min={0} onChange={(n) => set({ displayValue: String(Math.min(100, n)) })} />
        </Field>
      )}
      {(op === 'audioOut' || op === 'audioIn') && (
        <Field label={op === 'audioOut' ? t('df.speaker') : t('df.mic')} wide group>{text(op === 'audioOut' ? 'AirPods' : 'MacBook Pro Microphone')}</Field>
      )}
      {op === 'sound' && (
        <>
          <Field label={t('df.soundFile')} wide group help={t('df.sysSounds', { list: SYSTEM_SOUNDS.join(', ') })}>{text('Glass')}</Field>
          <Field label={t('df.wait')} help={t('df.waitHelp')}>
            <Switch on={!!s.soundWait} onChange={(soundWait) => set({ soundWait: soundWait || undefined })} label={t('df.wait')} />
          </Field>
        </>
      )}
      <span className={`col-span-2 -mt-1 ${hint}`}>{t(OP_HINT[op])}</span>
    </>
  );
}
