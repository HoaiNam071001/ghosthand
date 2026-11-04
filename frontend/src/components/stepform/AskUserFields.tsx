// Node Hỏi người dùng (bước 56 D1): câu hỏi, danh sách mục kèm theo, ô nhập tuỳ chọn, chờ tối đa.
import VarTextInput from '../inputs/VarTextInput';
import { Switch } from '../Switch';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { Field, hint, NumField, useNodeVars } from './shared';

export default function AskUserFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <Field label="Câu hỏi" wide group>
        <VarTextInput {...varProps} rows={2} value={s.message ?? ''} onChange={(v) => updateStep(s.id, { message: v })} placeholder="Gửi {{n2.output.count}} email nháp này?" />
      </Field>
      <Field label="Danh sách mục" wide group help="Hiện dưới câu hỏi, mỗi dòng một mục – vd các email sắp gửi. Trống = không có.">
        <VarTextInput {...varProps} rows={3} value={s.askItems ?? ''} onChange={(v) => updateStep(s.id, { askItems: v || undefined })} placeholder="{{n2.output.text}}" />
      </Field>
      <Field label="Có ô nhập" help="Cho bạn gõ thêm chữ (mã OTP, ghi chú) – node sau đọc ở output text.">
        <Switch on={!!s.askInput} onChange={() => updateStep(s.id, { askInput: !s.askInput || undefined })} label="Có ô nhập" />
      </Field>
      <NumField label="Chờ tối đa" step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Thanh mini hiện câu hỏi + thông báo hệ thống. Hết giờ (0 = chờ mãi) hoặc chạy hẹn giờ / CLI / API không có người → cổng Hết giờ.
      </span>
    </>
  );
}
