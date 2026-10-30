// Node Đọc tài liệu (bước 43 E3): ô soạn thảo (tự chọn | theo selector) + chỉ phần đang chọn.
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { fmtSec, Field, hint, NumField, SwitchField } from './shared';
import { ElementQueryFields } from './ElementFields';

export default function ReadDocumentFields({ step: s }: { step: Step }) {
  return (
    <>
      <ElementQueryFields step={s} optional />
      <SwitchField label="Chỉ phần đang chọn" help="Bật để lấy đúng đoạn đang bôi đen trong ô (cần có đoạn được chọn). Tắt: lấy cả tài liệu."
        on={!!s.selectionOnly} onChange={(selectionOnly) => updateStep(s.id, { selectionOnly: selectionOnly || undefined })} />
      <NumField label="Chờ tối đa" step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label="Kiểm tra mỗi">
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Không chỉ ô nào thì tự chọn ô soạn thảo có chữ lớn nhất trong cửa sổ. Giữ nguyên xuống dòng; node sau dùng {`{{${s.ref}.output.text}}`}.
        Chưa có chữ nào sau {fmtSec(s.timeoutMs)} → cổng Thất bại. macOS cần quyền Accessibility; Windows đọc qua UI Automation.
      </span>
    </>
  );
}
