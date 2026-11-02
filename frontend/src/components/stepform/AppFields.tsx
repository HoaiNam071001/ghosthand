// Node Ứng dụng (bước 26): thao tác, tên app (chọn từ app đang chạy, trạng thái đang chạy cạnh ô tên), buộc thoát.
import { useCallback, useEffect, useState } from 'react';
import { ListApps } from '../../../wailsjs/go/app/App';
import Segmented from '../Segmented';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { errorText } from '../../engineStore';
import { inWails } from '../../windowMode';
import { APP_OPS, appStatus, type AppInfo, type AppOp } from '../../flow/app';
import { WIN_MATCHES } from '../../flow/window';
import { Step } from '../../types';
import { errText, Field, fmtSec, hint, NumField, selectBox, SwitchField, useNodeVars } from './shared';
import { AppPicker } from './AppPicker';

// App đang chạy – tải khi mở inspector (trạng thái cạnh ô tên) và khi bấm Tải lại / mở danh sách.
function useApps() {
  const [apps, setApps] = useState<AppInfo[] | null>(null);
  const [error, setError] = useState<string>();
  const load = useCallback(() => {
    if (!inWails) return;
    ListApps().then((l) => { setApps(l ?? []); setError(undefined); }).catch((e) => setError(errorText(e)));
  }, []);
  useEffect(load, [load]);
  return { apps, error, load };
}

const OP_HINT: Record<AppOp, (t: string) => string> = {
  '': () => 'Đang chạy → cổng Đang chạy, không → Không chạy. Node không mở app – nối Không chạy vào node Mở.',
  waitStart: (t) => `Chờ app chạy và có cửa sổ (mới mở chưa có cửa sổ thì click vẫn trượt). Quá ${t} → cổng Thất bại.`,
  waitQuit: (t) => `Chờ mọi tiến trình của app thoát. Quá ${t} → cổng Thất bại.`,
  quit: (t) => `Đóng mọi cửa sổ như bấm × – app có thể hỏi lưu (node không tự bấm). Quá ${t} chưa thoát → Thất bại, hoặc buộc thoát nếu bật ở trên.`,
  forceQuit: () => 'Tắt ngay, mất dữ liệu chưa lưu. Lần chạy đầu app hỏi xác nhận. App không chạy → thành công luôn.',
};

export function AppFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const { apps, error, load } = useApps();
  const [picking, setPicking] = useState(false);
  const op = s.appOp ?? '';
  const name = s.appName ?? '';
  const status = apps && appStatus(apps, name, s.appMatch ?? '');
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };

  return (
    <>
      <Field label="Làm gì" wide group>
        <Select value={op} onChange={(v) => set({ appOp: (v || undefined) as AppOp | undefined })} className={selectBox} aria-label="Thao tác ứng dụng"
          options={APP_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      <Field label="App" wide group help="Tên app / tên exe (notepad.exe) / bundle id. App nhiều tiến trình (Chrome) tính là một.">
        <VarTextInput {...varProps} value={name} onChange={(v) => set({ appName: v || undefined })} placeholder="notepad.exe" />
        {!name.trim() ? <span className={errText}>Chưa nhập tên app</span>
          : status && <span className={`text-xs ${status.running ? 'text-ok' : 'text-muted'}`}>
            {status.running ? `● Đang chạy · ${status.windows ? `${status.windows} cửa sổ` : 'chưa có cửa sổ'}` : '○ Không chạy'}
          </span>}
      </Field>
      <Field label="So khớp" wide group help="Chứa / Đúng: không phân biệt hoa thường, không dấu. Thoát app: nên dùng Đúng để không trúng app khác cùng chữ.">
        <Segmented value={s.appMatch ?? ''} full label="So khớp" onChange={(v) => set({ appMatch: v || undefined })} options={WIN_MATCHES} />
      </Field>
      {inWails && (
        <div className="col-span-2 flex flex-col gap-1.5">
          <button onClick={() => { setPicking(!picking); if (!picking) load(); }}
            className="h-8 rounded-control border border-line text-[13px] text-ink hover:bg-hover">{picking ? 'Đóng danh sách' : 'Chọn từ app đang chạy…'}</button>
          {picking && (apps || error) && <AppPicker apps={apps ?? []} error={error}
            onPick={(a) => { set({ appName: a.name, appMatch: 'exact' }); setPicking(false); }} onRefresh={load} />}
        </div>
      )}
      {op === 'quit' && <SwitchField label="Quá giờ thì buộc thoát" on={!!s.appForce} onChange={(v) => set({ appForce: v || undefined })}
        help="App hỏi lưu / treo quá thời gian chờ → tắt hẳn, mất dữ liệu chưa lưu. Lần chạy đầu app hỏi xác nhận." />}
      {op !== '' && <NumField label="Chờ tối đa" info="Chờ app chạy / thoát tối đa – quá giờ đi cổng Thất bại" step={s} field="timeoutMs" unit="ms" min={0} />}
      <span className={`col-span-2 -mt-1 ${hint}`}>{OP_HINT[op](fmtSec(s.timeoutMs))}</span>
    </>
  );
}
