// Node Chạy lệnh (bước 43 S1): ngôn ngữ + nội dung lệnh (nguyên văn, KHÔNG nhận {{biến}}) + biến môi trường + thư mục + hết giờ.
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { fieldBox } from '../NumInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { SHELL_LANGS, type ShellLang } from '../../flow/shell';
import { Step } from '../../types';
import { KVTable } from './KVTable';
import { Field, hint, NumField, selectBox, useNodeVars } from './shared';
import { useT } from '../../i18n';

export default function ShellFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return (
    <>
      <Field label={t('sh.lang')} wide group help={t('sh.langHelp')}>
        <Select value={s.shellLang ?? ''} onChange={(v) => set({ shellLang: (v || undefined) as ShellLang | undefined })} className={selectBox} aria-label={t('sh.langLabel')}
          options={SHELL_LANGS.map((l) => ({ value: l.id as string, label: l.label }))} />
      </Field>
      <Field label={t('sh.cmd')} wide group help={t('sh.cmdHelp')}>
        <textarea value={s.script ?? ''} onChange={(e) => set({ script: e.target.value || undefined })} rows={5} spellCheck={false}
          placeholder={'echo "Hello $NAME"'} aria-label={t('sh.cmdLabel')} className={`${fieldBox} h-auto w-full resize-y py-2 font-mono text-[13px] text-ink outline-none placeholder:text-muted`} />
      </Field>
      <KVTable title={t('sh.env')} rows={s.shellEnv} onChange={(shellEnv) => set({ shellEnv })} keyHint="NAME" valueHint="{{n1.output.text}}" varProps={varProps}
        help={t('sh.envHelp')} />
      <Field label={t('sh.dir')} wide group help={t('sh.dirHelp')}>
        <PathInput kind="folder" {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })} placeholder="~/Documents" />
      </Field>
      <NumField label={t('common.maxWait')} info={t('sh.waitInfo')} step={s} field="timeoutMs" unit="ms" min={1} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('sh.note')} {t('pf.later')} {`{{${s.ref}.output.stdout}}`}, stderr, exitCode.
      </span>
    </>
  );
}
