// Node Thông tin máy (bước 43 S4): chỉ có ô chọn ổ / thư mục đo chỗ trống; mọi thông số khác luôn được đọc.
import { useT } from '../../i18n';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { Field, hint, useNodeVars } from './shared';

export default function SysInfoFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <Field label={t('si.disk')} wide group help={t('si.diskHelp')}>
        <VarTextInput {...varProps} rows={1} compact value={s.filePath ?? ''} onChange={(v) => updateStep(s.id, { filePath: v || undefined })} placeholder="/" />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('pf.later')} {`{{${s.ref}.output.batteryPercent}}`}, {`{{${s.ref}.output.diskFreeGB}}`}, {`{{${s.ref}.output.online}}`}… {t('si.note')}
      </span>
    </>
  );
}
