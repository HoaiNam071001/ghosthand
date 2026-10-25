// Node Tiến trình (bước 43 S5): thao tác, tên + cách so khớp, ngưỡng CPU / thời gian yên của "chờ hết bận".
import { useState } from 'react';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { ListProcesses } from '../../../wailsjs/go/main/App';
import { errorText } from '../../engineStore';
import { inWails } from '../../windowMode';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { PROC_OPS, type ProcOp } from '../../flow/process';
import { WIN_MATCHES } from '../../flow/window';
import { Step } from '../../types';
import { ProcessPicker, type ProcGroup } from './ProcessPicker';
import { Field, fmtSec, hint, NumField, selectBox, useNodeVars } from './shared';

const OP_HINT: Record<ProcOp, (t: string) => string> = {
  '': () => 'Đọc một lần, không bao giờ lỗi vì không thấy – dùng running / cpuPercent / memMB với node Nếu. Tên trống = liệt kê mọi tiến trình (items, nặng → nhẹ).',
  waitStart: (t) => `Chờ có tiến trình khớp (kể cả tiến trình nền không cửa sổ). Quá ${t} → cổng Thất bại.`,
  waitQuit: (t) => `Chờ mọi tiến trình khớp thoát. Quá ${t} → cổng Thất bại. Muốn thoát app → node Ứng dụng.`,
  waitIdle: (t) => `Chờ tổng CPU của tiến trình khớp thấp liên tục – dùng cho render / xuất file xong. Tiến trình không chạy → Thất bại; quá ${t} → Thất bại.`,
};

export default function ProcessFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const op = s.procOp ?? '';
  const [picking, setPicking] = useState(false);
  const [procs, setProcs] = useState<ProcGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const load = () => { // đọc CPU mất ~0,3 s – chỉ đọc khi mở danh sách
    if (!inWails) return;
    setLoading(true);
    ListProcesses().then((l) => { setProcs(l ?? []); setError(undefined); }).catch((e) => setError(errorText(e))).finally(() => setLoading(false));
  };
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <Field label="Làm gì" wide group>
        <Select value={op} onChange={(v) => set({ procOp: (v || undefined) as ProcOp | undefined })} className={selectBox} aria-label="Thao tác tiến trình"
          options={PROC_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      <Field label="Tên tiến trình" wide group help="Tên trong Activity Monitor / Task Manager (notepad.exe, Google Chrome Helper). Khác tên app: tiến trình con tính riêng.">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1"><VarTextInput {...varProps} value={s.procName ?? ''} onChange={(v) => set({ procName: v || undefined })} placeholder="ffmpeg" /></div>
          <button onClick={() => { if (!picking) load(); setPicking(!picking); }} aria-expanded={picking}
            className="h-[34px] flex-none rounded-control border border-line px-2.5 text-[13px] text-muted hover:bg-hover hover:text-ink">Chọn…</button>
        </div>
        {picking && <ProcessPicker procs={procs} loading={loading} error={error} onRefresh={load}
          onPick={(name) => { set({ procName: name, procMatch: 'exact' }); setPicking(false); }} />}
      </Field>
      <Field label="So khớp" wide group help="Chứa / Đúng: không phân biệt hoa thường, không dấu.">
        <Segmented value={s.procMatch ?? ''} full label="So khớp" onChange={(v) => set({ procMatch: v || undefined })} options={WIN_MATCHES} />
      </Field>
      {op === 'waitIdle' && <>
        <Field label="CPU dưới" help="Tổng CPU các tiến trình khớp phải dưới mức này. 100 = đầy một lõi, máy nhiều lõi có thể vượt 100">
          <NumInput value={s.cpuBelow ?? 0} unit="%" min={1} onChange={(cpuBelow) => set({ cpuBelow })} />
        </Field>
        <Field label="Yên liên tục" help={`CPU thấp liên tục ${fmtSec(s.stableMs)} mới đi tiếp – chạm ngưỡng thì đếm lại`}>
          <NumInput value={s.stableMs ?? 0} unit="ms" onChange={(stableMs) => set({ stableMs })} />
        </Field>
      </>}
      {op !== '' && <NumField label="Chờ tối đa" info="Quá giờ đi cổng Thất bại" step={s} field="timeoutMs" unit="ms" min={0} />}
      <span className={`col-span-2 -mt-1 ${hint}`}>{OP_HINT[op](fmtSec(s.timeoutMs))}</span>
      <span className={`col-span-2 -mt-1 ${hint}`}>Node sau dùng {`{{${s.ref}.output.cpuPercent}}`}, {`{{${s.ref}.output.memMB}}`}, {`{{${s.ref}.output.running}}`}…</span>
    </>
  );
}
