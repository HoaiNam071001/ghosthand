// Node Chuẩn hoá trình duyệt (bước 43 B3): chọn tab, các việc cần làm, cỡ cửa sổ.
import { updateStep } from '../../store';
import { Step } from '../../types';
import { BoundsFields } from './BoundsFields';
import { TAB_PLATFORM } from './BrowserTabFields';
import { errText, fmtSec, hint, NumField, SwitchField } from './shared';
import { BrowserField, TabTargetFields } from './TabTargetFields';

const ITEMS: { key: 'normFullscreen' | 'normSize' | 'normZoom' | 'normPopups'; label: string; help: string }[] = [
  { key: 'normFullscreen', label: 'Thoát toàn màn hình', help: 'Chỉ thoát khi cửa sổ đang toàn màn hình.' },
  { key: 'normSize', label: 'Đặt vị trí + cỡ cửa sổ', help: 'Như node Cửa sổ → Đặt vị trí + cỡ, áp cho cửa sổ chứa tab.' },
  { key: 'normZoom', label: 'Zoom về 100 %', help: 'Gửi Cmd+0 cho trang (trình duyệt không cho đọc mức zoom nên không biết trước đó là bao nhiêu).' },
  { key: 'normPopups', label: 'Đóng popup', help: 'Bấm Esc để tắt bong bóng đang mở (dịch trang, tải xuống…). Esc cũng huỷ ô đang nhập trên trang – chỉ bật khi cần.' },
];

export function BrowserNormFields({ step: s }: { step: Step }) {
  const none = !ITEMS.some((i) => s[i.key]);
  return (
    <>
      <BrowserField step={s} />
      <TabTargetFields step={s} fromOK need={false} placeholder="trống = tab đang hiện" />
      {ITEMS.map((i) => (
        <SwitchField key={i.key} label={i.label} help={i.help} on={!!s[i.key]} onChange={(v) => updateStep(s.id, { [i.key]: v || undefined })} />
      ))}
      {none && <span className={`col-span-2 ${errText}`}>Chưa bật việc nào</span>}
      {s.normSize && <BoundsFields step={s} />}
      <NumField label="Chờ tối đa" info="Chờ tìm tab, mỗi việc tối đa – quá giờ đi cổng Thất bại" step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>Đặt ngay sau node Mở, trước các bước click theo ảnh / chữ để toạ độ không lệch. Không thấy tab sau {fmtSec(s.timeoutMs)} → Thất bại. {TAB_PLATFORM}</span>
    </>
  );
}
