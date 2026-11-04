// Phạm vi tìm của node web (bước 46 A3): cả trang / chỉ trong hộp thoại đang mở + chỗ thứ mấy khi nhiều phần tử khớp;
// gặp hộp thoại JS (alert / confirm / prompt – 56 B1) thì báo lỗi hay tự bấm OK / Huỷ.
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { Field } from './shared';

export function WebScopeField({ step: s }: { step: Step }) {
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return <>
    <Field label="Tìm trong" wide group help={s.webScope === 'dialog'
      ? 'Chỉ trong hộp thoại đang mở trên cùng – bỏ ô cùng tên ở trang phía sau. Không có hộp thoại thì coi như chưa thấy.'
      : 'Cả trang (kể cả iframe cùng nguồn).'}>
      <Segmented value={s.webScope ?? ''} onChange={(v) => set({ webScope: (v || undefined) as Step['webScope'] })} full label="Tìm trong"
        options={[{ id: '', label: 'Cả trang' }, { id: 'dialog', label: 'Hộp thoại đang mở' }]} />
    </Field>
    <Field label="Hộp thoại JS" wide group help={s.webDialog
      ? 'Trang mở hộp alert / confirm / prompt thì tự bấm ' + (s.webDialog === 'accept' ? 'OK' : 'Huỷ') + ' rồi làm tiếp – chữ trong hộp ở output dialogText.'
      : 'Trang mở hộp alert / confirm / prompt thì node lỗi ngay (web_dialog) kèm chữ trong hộp – không chờ hết giờ.'}>
      <Segmented value={s.webDialog ?? ''} onChange={(v) => set({ webDialog: (v || undefined) as Step['webDialog'] })} full label="Hộp thoại JS"
        options={[{ id: '', label: 'Báo lỗi' }, { id: 'accept', label: 'Bấm OK' }, { id: 'dismiss', label: 'Bấm Huỷ' }]} />
    </Field>
    <Field label="Chỗ thứ" help="Nhiều phần tử khớp: chọn chỗ thứ mấy theo thứ tự trong trang. 0 = chỗ bấm được đầu tiên.">
      <NumInput value={s.occurrence ?? 0} min={0} onChange={(n) => set({ occurrence: n || undefined })} />
    </Field>
  </>;
}
