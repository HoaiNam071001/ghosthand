// Menu ▾ cạnh nút Chạy (cạnh phải hàng tab ribbon). off: không chạy được lúc này (trình duyệt / đang chạy);
// onFrom: có node đang chọn (only: chỉ riêng node đó).
import { RUN_ICON, RunMenuItem } from '../RunMenu';

export function runItems(ref: string | undefined, off: boolean, hasInputs: boolean, act: {
  from?: (only: boolean) => void; step: () => void; preview: () => void; record: () => void; inputs: () => void;
}): RunMenuItem[] {
  return [
    { label: ref ? `Chạy từ ${ref}` : 'Chạy từ node đang chọn', icon: RUN_ICON.from, disabled: off || !act.from, onClick: () => act.from?.(false),
      title: ref ? `Chạy một vòng bắt đầu từ ${ref} – các node trước đó không chạy` : 'Chọn một node để chạy từ đó' },
    { label: ref ? `Chạy riêng ${ref}` : 'Chạy riêng node đang chọn', icon: RUN_ICON.only, disabled: off || !act.from, onClick: () => act.from?.(true),
      title: ref ? `Chạy đúng ${ref} một lần rồi dừng – biến của node trước trống` : 'Chọn một node để chạy riêng' },
    { label: 'Chạy từng node', icon: RUN_ICON.step, hotkey: 'F10', disabled: off, onClick: act.step,
      title: 'Dừng trước mỗi node, bấm Tiếp / F10 để chạy node kế' },
    { label: 'Xem trước trên màn hình', icon: RUN_ICON.preview, onClick: act.preview,
      title: 'Xem đường đi các node bằng con trỏ giả, không click thật' },
    { label: 'Ghi thao tác', icon: RUN_ICON.record, hotkey: 'F9', danger: true, disabled: off, onClick: act.record,
      title: 'Thu nhỏ app, ghi chuột / phím bạn thao tác thành node – F9 để dừng' },
    { label: 'Sửa input trước khi chạy', minor: true, disabled: off || !hasInputs, onClick: act.inputs,
      title: hasInputs ? 'Mở form input rồi mới chạy – cũng mở được bằng Shift + bấm Chạy' : 'Kịch bản chưa có input' },
  ];
}
