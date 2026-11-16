// Node Chờ tải xong (bước 43 B6): thư mục theo dõi + mẫu tên file. Quét thư mục định kỳ, không cần quyền riêng.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { fmtSec, Field, hint, NumField, useNodeVars } from './shared';

export default function WaitDownloadFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <Field label={t('wd.dir')} wide group help={t('wd.dirHelp')}>
        <PathInput kind="folder" {...varProps} value={s.filePath ?? ''} onChange={(v) => updateStep(s.id, { filePath: v || undefined })} placeholder="~/Downloads" />
      </Field>
      <Field label={t('fi.pattern')} wide group help={t('wd.patHelp')}>
        <VarTextInput {...varProps} rows={1} compact value={s.filePattern ?? ''} onChange={(v) => updateStep(s.id, { filePattern: v || undefined })} placeholder="*.pdf" />
      </Field>
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 500} min={50} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('wd.note')}
        {t('pf.later')} {`{{${s.ref}.output.path}}`} / {`{{${s.ref}.output.name}}`}. {t('wd.miss', { t: fmtSec(s.timeoutMs) })}
      </span>
    </>
  );
}
