// Phạm vi tìm của node web (bước 46 A3): cả trang / chỉ trong hộp thoại đang mở + chỗ thứ mấy khi nhiều phần tử khớp;
// gặp hộp thoại JS (alert / confirm / prompt – 56 B1) thì báo lỗi hay tự bấm OK / Huỷ.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { Field } from './shared';

export function WebScopeField({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return <>
    <Field label={t('er.in')} wide group help={t(s.webScope === 'dialog' ? 'ws.dialogHelp' : 'ws.pageHelp')}>
      <Segmented value={s.webScope ?? ''} onChange={(v) => set({ webScope: (v || undefined) as Step['webScope'] })} full label={t('er.in')}
        options={[{ id: '', label: t('ws.page') }, { id: 'dialog', label: t('ws.dialog') }]} />
    </Field>
    <Field label={t('ws.js')} wide group help={s.webDialog ? t('ws.jsAuto', { btn: s.webDialog === 'accept' ? 'OK' : t('ws.cancelBtn') }) : t('ws.jsErr')}>
      <Segmented value={s.webDialog ?? ''} onChange={(v) => set({ webDialog: (v || undefined) as Step['webDialog'] })} full label={t('ws.js')}
        options={[{ id: '', label: t('ws.err') }, { id: 'accept', label: t('ws.pressOk') }, { id: 'dismiss', label: t('ws.pressCancel') }]} />
    </Field>
    <Field label={t('el.f.nth')} help={t('ws.nthHelp')}>
      <NumInput value={s.occurrence ?? 0} min={0} onChange={(n) => set({ occurrence: n || undefined })} />
    </Field>
  </>;
}
