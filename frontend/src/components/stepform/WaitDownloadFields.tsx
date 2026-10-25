// Node Chờ tải xong (bước 43 B6): thư mục theo dõi + mẫu tên file. Quét thư mục định kỳ, không cần quyền riêng.
import NumInput from '../NumInput';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { fmtSec, Field, hint, NumField, useNodeVars } from './shared';

export default function WaitDownloadFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <Field label="Thư mục tải về" wide group help="Trống = Downloads của người dùng · ~ = thư mục người dùng">
        <PathInput kind="folder" {...varProps} value={s.filePath ?? ''} onChange={(v) => updateStep(s.id, { filePath: v || undefined })} placeholder="~/Downloads" />
      </Field>
      <Field label="Mẫu tên file" wide group help="Vd *.pdf, bao-cao-*.xlsx · không phân biệt hoa thường · trống = file mới bất kỳ">
        <VarTextInput {...varProps} rows={1} compact value={s.filePattern ?? ''} onChange={(v) => updateStep(s.id, { filePattern: v || undefined })} placeholder="*.pdf" />
      </Field>
      <NumField label="Chờ tối đa" step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label="Kiểm tra mỗi">
        <NumInput value={s.intervalMs ?? 500} min={50} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Chỉ tính file MỚI về sau lúc node bắt đầu – đặt ngay sau nút Tải. Bỏ qua file đang tải dở (.crdownload, .part, .tmp), chờ cỡ file ngừng tăng.
        Node sau dùng {`{{${s.ref}.output.path}}`} / {`{{${s.ref}.output.name}}`}. Chưa thấy sau {fmtSec(s.timeoutMs)} → cổng Thất bại.
      </span>
    </>
  );
}
