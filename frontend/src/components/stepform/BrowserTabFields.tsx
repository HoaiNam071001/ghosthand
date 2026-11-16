// Node Tab trình duyệt (bước 43 B1): thao tác, trình duyệt, tab cần làm (của node Mở / theo tiêu đề · URL), URL tab mới.
import { tr, useT } from '../../i18n';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep } from '../../store';
import { TAB_FROM_OPS, TAB_OPS, tabTargeted, type TabOp } from '../../flow/browserTab';
import { Step } from '../../types';
import { Field, fmtSec, hint, NumField, selectBox } from './shared';
import { BrowserField, TabTargetFields, useTabVarProps } from './TabTargetFields';

/** Ghi chú nền tảng chung cho node tab / đi tới URL / chuẩn hoá. */
export const tabPlatform = () => tr('bt.platform');

const OP_HINT: Record<TabOp, (t: string) => string> = {
  '': () => tr('bt.h.read'),
  list: () => tr('bt.h.list'),
  switch: (t) => tr('bt.h.switch', { t }),
  new: () => tr('bt.h.new'),
  close: (t) => tr('bt.h.close', { t }),
  closeOthers: () => tr('bt.h.closeOthers'),
  reload: () => tr('bt.h.reload'),
  back: () => tr('bt.h.back'),
  forward: () => tr('bt.h.forward'),
  waitOpen: (t) => tr('bt.h.waitOpen', { t }),
  waitClose: (t) => tr('bt.h.waitClose', { t }),
};

export function BrowserTabFields({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = useTabVarProps(s);
  const op = s.tabOp ?? '';
  // thao tác không dùng tab của node Mở → bỏ tabFrom (ô chọn bị ẩn, để lại thì kiểm tra báo lỗi không sửa được)
  const setOp = (v: TabOp) => set({ tabOp: v || undefined, ...(TAB_FROM_OPS.includes(v) ? {} : { tabFrom: undefined }) });

  return (
    <>
      <Field label={t('ap.do')} wide group>
        <Select value={op} onChange={(v) => setOp(v as TabOp)} className={selectBox} aria-label={t('bt.opLabel')}
          options={TAB_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      <BrowserField step={s} />
      {op === 'new' ? (
        <Field label="URL" wide group help={t('bt.urlHelp')}>
          <VarTextInput {...varProps} value={s.url ?? ''} onChange={(v) => set({ url: v || undefined })} placeholder="https://" />
        </Field>
      ) : (
        <TabTargetFields step={s} fromOK={TAB_FROM_OPS.includes(op)} need={op.startsWith('wait')}
          placeholder={op === 'list' ? t('bt.phAll') : op.startsWith('wait') ? t('bt.phWait') : t('bt.phCur')} />
      )}
      {tabTargeted(op) && <NumField label={t('common.maxWait')} info={t('bt.waitInfo')} step={s} field="timeoutMs" unit="ms" min={0} />}
      <span className={`col-span-2 -mt-1 ${hint}`}>{OP_HINT[op](fmtSec(s.timeoutMs))} {tabPlatform()}</span>
    </>
  );
}
