// Node Đọc bảng (bước 43 B5): phạm vi (bảng đầu tiên | bảng thứ N | bảng trong một phần tử) + ghi ra file .csv / .xlsx.
import NumInput from '../NumInput';
import PathInput from './PathInput';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { errText, fmtSec, Field, hint, NumField, SwitchField, useNodeVars } from './shared';
import { ElementQueryFields } from './ElementFields';

export default function ReadTableFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const file = s.filePath?.trim() ?? '';
  const badFile = !!file && !file.includes('{{') && !/\.(csv|xlsx)$/i.test(file);
  return (
    <>
      <ElementQueryFields step={s} optional />
      <SwitchField label="Gồm phần ngoài khung nhìn" help="Mặc định chỉ đọc dòng đang hiện trên màn. Bật để lấy cả bảng dài chưa cuộn tới."
        on={!!s.pageAll} onChange={(pageAll) => updateStep(s.id, { pageAll: pageAll || undefined })} />
      <Field label="Ghi ra file" wide group help="Trống = không ghi. .csv hoặc .xlsx · GHI ĐÈ file cũ · ~ = thư mục người dùng">
        <PathInput kind="save" {...varProps} value={s.filePath ?? ''} onChange={(v) => updateStep(s.id, { filePath: v || undefined })}
          placeholder="~/Documents/don-hang.xlsx" />
        {badFile && <span className={errText}>Chỉ ghi được file .csv hoặc .xlsx – đổi đuôi file</span>}
      </Field>
      {/\.xlsx$/i.test(file) && (
        <Field label="Sheet" wide group>
          <VarTextInput {...varProps} rows={1} compact value={s.sheet ?? ''} onChange={(v) => updateStep(s.id, { sheet: v || undefined })} placeholder="trống = sheet đầu" />
        </Field>
      )}
      <NumField label="Chờ tối đa" step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label="Kiểm tra mỗi">
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Dòng đầu là tên cột. Node sau dùng {`{{${s.ref}.output.items}}`} nối vào Lặp qua danh sách (mỗi dòng {`{{item.<tên cột không dấu>}}`}), hoặc {`{{${s.ref}.output.rows}}`}.
        Chưa thấy bảng (table / grid) sau {fmtSec(s.timeoutMs)} → cổng Thất bại. Cần quyền Accessibility.
      </span>
    </>
  );
}
