// Node Chuẩn hoá trình duyệt (bước 43 B3): chọn tab, các việc cần làm, cỡ cửa sổ.
import { updateStep } from '../../store';
import { NORM_TARGET_MSG, normTargetMissing } from '../../flow/browserTab';
import { Step } from '../../types';
import { BoundsFields } from './BoundsFields';
import { tabPlatform } from './BrowserTabFields';
import { useT } from '../../i18n';
import type { MsgKey } from '../../i18n/vi';
import { errText, fmtSec, hint, NumField, SwitchField } from './shared';
import { BrowserField, TabTargetFields } from './TabTargetFields';

const ITEMS: { key: 'normFullscreen' | 'normSize' | 'normZoom' | 'normPopups'; label: MsgKey; help: MsgKey }[] = [
  { key: 'normFullscreen', label: 'bn.fs', help: 'bn.fsHelp' },
  { key: 'normSize', label: 'bn.size', help: 'bn.sizeHelp' },
  { key: 'normZoom', label: 'bn.zoom', help: 'bn.zoomHelp' },
  { key: 'normPopups', label: 'bn.popups', help: 'bn.popupsHelp' },
];

export function BrowserNormFields({ step: s }: { step: Step }) {
  const t = useT();
  const none = !ITEMS.some((i) => s[i.key]);
  const miss = normTargetMissing(s);
  return (
    <>
      <BrowserField step={s} />
      <TabTargetFields step={s} fromOK need={false} placeholder={s.normSize ? t('bn.ph') : t('bt.phCur')} />
      {miss && <span className={`col-span-2 ${errText}`}>{NORM_TARGET_MSG[miss]}</span>}
      {ITEMS.map((i) => (
        <SwitchField key={i.key} label={t(i.label)} help={t(i.help)} on={!!s[i.key]} onChange={(v) => updateStep(s.id, { [i.key]: v || undefined })} />
      ))}
      {none && <span className={`col-span-2 ${errText}`}>{t('tab.w.noneOn')}</span>}
      {s.normSize && <BoundsFields step={s} />}
      <NumField label={t('common.maxWait')} info={t('bn.waitInfo')} step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>{t('bn.note', { t: fmtSec(s.timeoutMs) })} {tabPlatform()}</span>
    </>
  );
}
