// Công tắc "chỉ thao tác trong cửa sổ này" cho node chuột / phím (46 C2): sai cửa sổ → node lỗi window_mismatch, chưa bấm / gõ gì.
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { WIN_MATCHES } from '../../flow/window';
import { Step } from '../../types';
import { Field, hint, SwitchField, useNodeVars } from './shared';

export default function WindowGuardField({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }), rows: 1, compact: true } as const;
  return (
    <>
      <SwitchField label="Chỉ trong cửa sổ" on={!!s.onlyInWindow} onChange={(v) => set({ onlyInWindow: v || undefined })}
        help="Bật: trước khi bấm / gõ, node kiểm tra cửa sổ này đang ở trước. Đã đóng hoặc app khác che → lỗi, không thao tác nhầm." />
      {s.onlyInWindow && (
        <>
          <Field label="App" wide group help="Tên app / tên exe / bundle id (chọn ít nhất app hoặc tiêu đề)">
            <VarTextInput {...varProps} value={s.winApp ?? ''} onChange={(v) => set({ winApp: v || undefined })} placeholder="vd chrome" />
          </Field>
          <Field label="Tiêu đề" wide group help="Trống = mọi tiêu đề">
            <VarTextInput {...varProps} value={s.winTitle ?? ''} onChange={(v) => set({ winTitle: v || undefined })} placeholder="trống = mọi tiêu đề" />
          </Field>
          <Field label="So khớp" wide group>
            <Segmented value={s.winMatch ?? ''} full label="So khớp" onChange={(v) => set({ winMatch: v || undefined })} options={WIN_MATCHES} />
          </Field>
          {!s.winApp?.trim() && !s.winTitle?.trim() && <span className={`col-span-2 -mt-1 ${hint}`}>Chưa chọn cửa sổ – nhập tên app hoặc tiêu đề.</span>}
        </>
      )}
    </>
  );
}
