// Node Chạy lệnh (bước 43 S1): ngôn ngữ + nội dung lệnh (nguyên văn, KHÔNG nhận {{biến}}) + biến môi trường + thư mục + hết giờ.
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { fieldBox } from '../NumInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { SHELL_LANGS, type ShellLang } from '../../flow/shell';
import { Step } from '../../types';
import { KVTable } from './KVTable';
import { Field, hint, NumField, selectBox, useNodeVars } from './shared';

export default function ShellFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return (
    <>
      <Field label="Ngôn ngữ" wide group help="AppleScript · JXA chỉ chạy trên macOS">
        <Select value={s.shellLang ?? ''} onChange={(v) => set({ shellLang: (v || undefined) as ShellLang | undefined })} className={selectBox} aria-label="Ngôn ngữ script"
          options={SHELL_LANGS.map((l) => ({ value: l.id as string, label: l.label }))} />
      </Field>
      <Field label="Lệnh" wide group help="Chạy nguyên văn – không thay {{biến}} trong lệnh (chống chèn lệnh). Đưa biến vào lệnh qua biến môi trường bên dưới.">
        <textarea value={s.script ?? ''} onChange={(e) => set({ script: e.target.value || undefined })} rows={5} spellCheck={false}
          placeholder={'echo "Xin chao $TEN"'} aria-label="Nội dung lệnh" className={`${fieldBox} h-auto w-full resize-y py-2 font-mono text-[13px] text-ink outline-none placeholder:text-muted`} />
      </Field>
      <KVTable title="Biến môi trường" rows={s.shellEnv} onChange={(shellEnv) => set({ shellEnv })} keyHint="TEN" valueHint="{{n1.output.text}}" varProps={varProps}
        help="Đọc trong lệnh bằng $TEN (zsh) · %TEN% (cmd) · $env:TEN (PowerShell) · system attribute “TEN” (AppleScript)." />
      <Field label="Thư mục chạy" wide group help="Trống = thư mục của app · ~ = thư mục người dùng">
        <PathInput kind="folder" {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })} placeholder="~/Documents" />
      </Field>
      <NumField label="Chờ tối đa" info="Quá giờ thì dừng cả cây tiến trình của lệnh và đi cổng Thất bại" step={s} field="timeoutMs" unit="ms" min={1} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Lệnh chỉ chạy sau khi bạn đồng ý nội dung lệnh (hộp xác nhận lúc bấm Chạy; sửa lệnh thì hỏi lại). Mã thoát khác 0 → cổng Thất bại.
        Node sau dùng {`{{${s.ref}.output.stdout}}`}, stderr, exitCode.
      </span>
    </>
  );
}
