// Node Đọc bảng (bước 43 B5): phạm vi (bảng đầu tiên | bảng thứ N | bảng trong một phần tử) + ghi ra file .csv / .xlsx.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import PathInput from './PathInput';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { errText, fmtSec, Field, hint, NumField, SwitchField, useNodeVars } from './shared';
import { ElementQueryFields } from './ElementFields';

export default function ReadTableFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const file = s.filePath?.trim() ?? '';
  const badFile = !!file && !file.includes('{{') && !/\.(csv|xlsx)$/i.test(file);
  return (
    <>
      <ElementQueryFields step={s} optional />
      <SwitchField label={t('rt2.all')} help={t('rt2.allHelp')}
        on={!!s.pageAll} onChange={(pageAll) => updateStep(s.id, { pageAll: pageAll || undefined })} />
      <Field label={t('rt2.write')} wide group help={t('rt2.writeHelp')}>
        <PathInput kind="save" {...varProps} value={s.filePath ?? ''} onChange={(v) => updateStep(s.id, { filePath: v || undefined })}
          placeholder="~/Documents/orders.xlsx" />
        {badFile && <span className={errText}>{t('rt2.badExt')}</span>}
      </Field>
      {/\.xlsx$/i.test(file) && (
        <Field label="Sheet" wide group>
          <VarTextInput {...varProps} rows={1} compact value={s.sheet ?? ''} onChange={(v) => updateStep(s.id, { sheet: v || undefined })} placeholder={t('fi.sheetPh')} />
        </Field>
      )}
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('rt2.note1')} {`{{${s.ref}.output.items}}`} {t('rt2.note2')} {`{{item.<${t('rt2.colName')}>}}`}), {t('rt2.note3')} {`{{${s.ref}.output.rows}}`}.
        {t('rt2.note4', { t: fmtSec(s.timeoutMs) })}
      </span>
    </>
  );
}
