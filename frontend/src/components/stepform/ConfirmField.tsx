// Công tắc "Đánh dấu ghi / xoá" (46 C1): node đánh dấu phải được người dùng đồng ý trước lần chạy đầu – cả khi AI / hẹn giờ / CLI chạy.
import { updateStep } from '../../store';
import { Step } from '../../types';
import { SwitchField } from './shared';

export default function ConfirmField({ step: s }: { step: Step }) {
  return (
    <SwitchField label="Ghi / xoá dữ liệu" on={!!s.confirm} onChange={(v) => updateStep(s.id, { confirm: v || undefined })}
      help="Đánh dấu node này sửa hoặc xoá dữ liệu thật (vd bấm Lưu / Xoá trong app khác). Lần chạy đầu app hỏi bạn đồng ý; AI, hẹn giờ, CLI cũng không chạy được khi chưa đồng ý." />
  );
}
