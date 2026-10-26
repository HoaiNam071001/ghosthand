// Node Tab trình duyệt (bước 43 B1): thao tác, trình duyệt, tab cần làm (của node Mở / theo tiêu đề · URL), URL tab mới.
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep } from '../../store';
import { TAB_FROM_OPS, TAB_OPS, tabTargeted, type TabOp } from '../../flow/browserTab';
import { Step } from '../../types';
import { Field, fmtSec, hint, NumField, selectBox } from './shared';
import { BrowserField, TabTargetFields, useTabVarProps } from './TabTargetFields';

// Hết cầu nối tạm khi có bản Windows (43 B1w).
export const MAC_ONLY = 'Hiện chỉ chạy trên macOS – lần đầu macOS hỏi cho phép điều khiển trình duyệt.';
/** Ghi chú nền tảng chung cho node tab / đi tới URL / chuẩn hoá. */
export const TAB_PLATFORM = 'macOS: lần đầu hỏi cho phép điều khiển trình duyệt. Windows: đọc qua UI Automation – chỉ tab đang hiện có URL, tab khác tìm theo tiêu đề; thao tác tải lại / đi tới URL đổi sang tab đó và cần cửa sổ ở trước.';

const OP_HINT: Record<TabOp, (t: string) => string> = {
  '': () => 'Chỉ đọc URL + tiêu đề tab, không đổi gì – nối Nếu để rẽ nhánh theo trang đang mở.',
  list: () => 'Mọi tab khớp (trống = mọi tab) vào output items – nối Lặp qua danh sách.',
  switch: (t) => `Chuyển tới tab và đưa cửa sổ lên trước. Chưa thấy tab thì chờ tới ${t}.`,
  new: () => 'Mở tab mới ở cửa sổ trên cùng của trình duyệt. Chưa mở trình duyệt nào → Thất bại (mở bằng node Mở trước).',
  close: (t) => `Đóng một tab (tab đầu tiên khớp). Chưa thấy tab thì chờ tới ${t}.`,
  closeOthers: () => 'Đóng mọi tab khác trong cùng cửa sổ, giữ tab đã chọn.',
  reload: () => 'Tải lại tab. Output đọc ngay sau khi bấm – trang có thể chưa tải xong.',
  back: () => 'Quay lại trang trước trong tab.',
  forward: () => 'Tiến tới trang sau trong tab.',
  waitOpen: (t) => `Chờ có tab khớp. Quá ${t} → cổng Thất bại.`,
  waitClose: (t) => `Chờ hết tab khớp (hoặc tab của node Mở đóng). Quá ${t} → cổng Thất bại.`,
};

export function BrowserTabFields({ step: s }: { step: Step }) {
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = useTabVarProps(s);
  const op = s.tabOp ?? '';
  // thao tác không dùng tab của node Mở → bỏ tabFrom (ô chọn bị ẩn, để lại thì kiểm tra báo lỗi không sửa được)
  const setOp = (v: TabOp) => set({ tabOp: v || undefined, ...(TAB_FROM_OPS.includes(v) ? {} : { tabFrom: undefined }) });

  return (
    <>
      <Field label="Làm gì" wide group>
        <Select value={op} onChange={(v) => setOp(v as TabOp)} className={selectBox} aria-label="Thao tác tab"
          options={TAB_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      <BrowserField step={s} />
      {op === 'new' ? (
        <Field label="URL" wide group help="Trống = trang trống. Tên miền tự thêm https://.">
          <VarTextInput {...varProps} value={s.url ?? ''} onChange={(v) => set({ url: v || undefined })} placeholder="https://" />
        </Field>
      ) : (
        <TabTargetFields step={s} fromOK={TAB_FROM_OPS.includes(op)} need={op.startsWith('wait')}
          placeholder={op === 'list' ? 'trống = mọi tab' : op.startsWith('wait') ? 'vd mail.google.com' : 'trống = tab đang hiện'} />
      )}
      {tabTargeted(op) && <NumField label="Chờ tối đa" info="Chưa thấy tab thì chờ tối đa – quá giờ đi cổng Thất bại" step={s} field="timeoutMs" unit="ms" min={0} />}
      <span className={`col-span-2 -mt-1 ${hint}`}>{OP_HINT[op](fmtSec(s.timeoutMs))} {TAB_PLATFORM}</span>
    </>
  );
}
