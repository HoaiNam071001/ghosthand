// Node Clipboard (bước 35 N2): đọc chữ / ghi chữ / ghi ảnh PNG từ file – ô chữ nhận {{biến}}.
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { CLIP_OPS, type ClipOp } from '../../flow/clipboard';
import { Step } from '../../types';
import { errText, Field, useNodeVars } from './shared';

export function ClipFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const op = s.clipOp ?? '';
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  // node Chụp màn hình gần nhất – gợi ý điền sẵn đường dẫn ảnh của nó
  const shot = script.steps.find((x) => x.type === 'screenshot' && x.id !== s.id);
  return (
    <>
      <Field label="Làm gì" wide group help={op === 'write' ? 'Thay nội dung clipboard bằng chữ dưới – để trống = xoá clipboard'
        : op === 'image' ? 'Chép ảnh PNG vào clipboard để dán (Cmd/Ctrl+V) vào chat, email…'
        : `Đọc chữ đang có – node sau dùng {{${s.ref}.output.text}}; clipboard chỉ có ảnh thì ra rỗng`}>
        <Segmented value={op} options={CLIP_OPS} onChange={(clipOp: ClipOp) => set({ clipOp: clipOp || undefined })} full label="Phép clipboard" />
      </Field>
      {op === 'write' && (
        <Field label="Nội dung" wide group>
          <VarTextInput {...varProps} value={s.text} onChange={(text) => set({ text })} placeholder="Mã đơn: {{n2.output.text}}" />
        </Field>
      )}
      {op === 'image' && (
        <Field label="File ảnh PNG" wide group help="~ / đường dẫn tương đối tính từ thư mục người dùng">
          <PathInput kind="file" {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })}
            placeholder={shot ? `{{${shot.ref}.output.path}}` : '~/Pictures/anh.png'} />
          {!s.filePath?.trim() && (
            <span className={errText}>Chưa nhập file – chạy sẽ báo lỗi
              {shot && <> · <button className="text-accent-text underline" onClick={() => set({ filePath: `{{${shot.ref}.output.path}}` })}>dùng ảnh của {shot.ref}</button></>}
            </span>
          )}
        </Field>
      )}
    </>
  );
}
