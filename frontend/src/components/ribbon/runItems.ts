// Menu ▾ cạnh nút Chạy (cạnh phải hàng tab ribbon). off: không chạy được lúc này (trình duyệt / đang chạy);
// onFrom: có node đang chọn (only: chỉ riêng node đó).
import { tr } from '../../i18n/lang';
import { RUN_ICON, RunMenuItem } from '../RunMenu';

export function runItems(ref: string | undefined, off: boolean, hasInputs: boolean, act: {
  from?: (only: boolean) => void; step: () => void; preview: () => void; record: () => void; inputs: () => void;
}): RunMenuItem[] {
  return [
    { label: ref ? tr('ri.from', { r: ref }) : tr('ri.fromSel'), icon: RUN_ICON.from, disabled: off || !act.from, onClick: () => act.from?.(false),
      title: ref ? tr('ri.fromTip', { r: ref }) : tr('ri.fromNeed') },
    { label: ref ? tr('ri.only', { r: ref }) : tr('ri.onlySel'), icon: RUN_ICON.only, disabled: off || !act.from, onClick: () => act.from?.(true),
      title: ref ? tr('ri.onlyTip', { r: ref }) : tr('ri.onlyNeed') },
    { label: tr('ri.step'), icon: RUN_ICON.step, hotkey: 'F10', disabled: off, onClick: act.step,
      title: tr('ri.stepTip') },
    { label: tr('ri.preview'), icon: RUN_ICON.preview, onClick: act.preview,
      title: tr('ri.previewTip') },
    { label: tr('ri.record'), icon: RUN_ICON.record, hotkey: 'F9', danger: true, disabled: off, onClick: act.record,
      title: tr('ri.recordTip') },
    { label: tr('ri.inputs'), minor: true, disabled: off || !hasInputs, onClick: act.inputs,
      title: hasInputs ? tr('ri.inputsTip') : tr('ri.noInputs') },
  ];
}
