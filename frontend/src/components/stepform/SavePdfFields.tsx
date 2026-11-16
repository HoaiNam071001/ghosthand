// Node Lưu trang ra PDF (bước 43 B7): file đích, trình duyệt, tab cần in, thời gian chờ.
import { tr, useT } from '../../i18n';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { errText, Field, fmtSec, hint, NumField } from './shared';
import { BrowserField, TabTargetFields, useTabVarProps } from './TabTargetFields';

export function SavePdfFields({ step: s }: { step: Step }) {
  const t = useT();
  const varProps = useTabVarProps(s);
  const path = s.filePath ?? '';
  const bad = !path.trim() ? tr('tab.w.noPdf') : !path.includes('{{') && !/\.pdf$/i.test(path.trim()) ? tr('tab.w.pdfExt') : '';
  return (
    <>
      <Field label={t('sp.file')} wide group help={t('sp.fileHelp')}>
        <PathInput kind="save" {...varProps} value={path} onChange={(v) => updateStep(s.id, { filePath: v || undefined })} placeholder="~/Documents/report.pdf" />
        {bad && <span className={errText}>{bad}</span>}
      </Field>
      <BrowserField step={s} />
      <TabTargetFields step={s} fromOK need={false} placeholder={t('bt.phCur')} />
      <NumField label={t('common.maxWait')} info={t('sp.waitInfo')} step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>{t('sp.note', { t: fmtSec(s.timeoutMs) })}</span>
    </>
  );
}
