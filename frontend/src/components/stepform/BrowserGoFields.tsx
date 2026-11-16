// Node Đi tới URL (bước 43 B2): URL, trình duyệt, tab cần đổi trang, thời gian chờ tải.
import VarTextInput from '../inputs/VarTextInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { errText, Field, fmtSec, hint, NumField } from './shared';
import { BrowserField, TabTargetFields, useTabVarProps } from './TabTargetFields';
import { tabPlatform } from './BrowserTabFields';
import { useT } from '../../i18n';

export function BrowserGoFields({ step: s }: { step: Step }) {
  const t = useT();
  const varProps = useTabVarProps(s);
  const url = s.url ?? '';
  return (
    <>
      <Field label="URL" wide group help={t('bg.urlHelp')}>
        <VarTextInput {...varProps} value={url} onChange={(v) => updateStep(s.id, { url: v || undefined })} placeholder="https://" />
        {!url.trim() && <span className={errText}>{t('tab.w.noUrl')}</span>}
      </Field>
      <BrowserField step={s} />
      <TabTargetFields step={s} fromOK need={false} placeholder={t('bt.phCur')} />
      <NumField label={t('common.maxWait')} info={t('bg.waitInfo')} step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>{t('bg.note', { t: fmtSec(s.timeoutMs) })} {tabPlatform()}</span>
    </>
  );
}
