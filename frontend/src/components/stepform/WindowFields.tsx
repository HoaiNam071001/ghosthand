// Node Cửa sổ (bước 26): chọn cửa sổ (app + tiêu đề, chọn từ danh sách đang mở), thao tác, khung đích của setBounds.
import { useCallback, useState } from 'react';
import { ListWindows } from '../../../wailsjs/go/app/App';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { errorText } from '../../engineStore';
import { inWails } from '../../windowMode';
import { matchWindow, WIN_MATCHES, WIN_OPS, WIN_PRESETS, windowHasBox, type WindowInfo, type WinOp } from '../../flow/window';
import { Rect, Step } from '../../types';
import { errText, Field, fmtSec, hint, NumField, selectBox, useNodeVars } from './shared';
import { DisplayPicker } from './ShotFields';
import { BoundsFields } from './BoundsFields';
import { WindowPicker } from './WindowPicker';

// Danh sách cửa sổ đang mở – tải khi cần (mở danh sách / lấy khung), không tự làm mới.
function useWindows() {
  const [wins, setWins] = useState<WindowInfo[] | null>(null);
  const [error, setError] = useState<string>();
  const load = useCallback(() => ListWindows().then((l) => { setWins(l ?? []); setError(undefined); return l ?? []; })
    .catch((e) => { setError(errorText(e)); return [] as WindowInfo[]; }), []);
  return { wins, error, load };
}

export function WindowFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const { wins, error, load } = useWindows();
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState<string>();
  const op = s.winOp ?? '';
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const empty = !s.winApp?.trim() && !s.winTitle?.trim();
  const rect: Rect = s.winRect ?? { x: 0, y: 0, w: 0, h: 0 };
  const setRect = (r: Partial<Rect>) => set({ winRect: { ...rect, ...r } });

  // Lấy khung hiện tại của cửa sổ đang khớp → winRect (preset toạ độ: cả vị trí; preset khác: cỡ)
  const takeCurrent = async () => {
    const list = await load();
    let i = -1;
    try { i = matchWindow(list, s.winApp ?? '', s.winTitle ?? '', s.winMatch ?? ''); } catch { /* regex sai – báo ở dưới */ }
    const w = list[i];
    if (!w || w.minimized) return setNote(w ? 'Cửa sổ đang thu nhỏ – mở lên rồi lấy lại' : 'Không thấy cửa sổ khớp đang mở');
    setNote(undefined);
    set({ winRect: { ...w.box } });
  };
  const pick = (w: WindowInfo) => { set({ winApp: w.app, winTitle: w.title }); setPicking(false); };

  return (
    <>
      <Field label="Làm gì" wide group>
        <Select value={op} onChange={(v) => set({ winOp: (v || undefined) as WinOp | undefined })} className={selectBox} aria-label="Thao tác cửa sổ"
          options={WIN_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      <Field label="App" wide group help="Tên app / tên exe (chrome.exe) / bundle id – trống = mọi app">
        <VarTextInput {...varProps} value={s.winApp ?? ''} onChange={(v) => set({ winApp: v || undefined })} placeholder="chrome" />
      </Field>
      <Field label="Tiêu đề" wide group help="Trống = mọi tiêu đề. Tiêu đề hay đổi (tab trình duyệt, tên file) – chỉ giữ phần cố định.">
        <VarTextInput {...varProps} value={s.winTitle ?? ''} onChange={(v) => set({ winTitle: v || undefined })} placeholder="trống = mọi tiêu đề" />
        {empty && <span className={errText}>Chưa chọn cửa sổ – nhập app hoặc tiêu đề</span>}
      </Field>
      <Field label="So khớp" wide group help="Chứa / Đúng: không phân biệt hoa thường, không dấu. Nhiều cửa sổ khớp → cửa sổ trên cùng.">
        <Segmented value={s.winMatch ?? ''} full label="So khớp" onChange={(v) => set({ winMatch: v || undefined })} options={WIN_MATCHES} />
      </Field>
      {inWails && (
        <div className="col-span-2 flex flex-col gap-1.5">
          <button onClick={() => { setPicking(!picking); if (!picking) load(); }}
            className="h-8 rounded-control border border-line text-[13px] text-ink hover:bg-hover">{picking ? 'Đóng danh sách' : 'Chọn từ cửa sổ đang mở…'}</button>
          {picking && (wins || error) && <WindowPicker wins={wins ?? []}error={error} onPick={pick} onRefresh={load} />}
        </div>
      )}
      {op === 'setBounds' && <BoundsFields step={s} onTakeCurrent={inWails ? takeCurrent : undefined} note={note} />}
      <NumField label="Chờ tối đa" info={`Chờ cửa sổ ${op === 'waitClose' ? 'đóng' : 'hiện'} tối đa – quá giờ đi cổng Thất bại`} step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {op === 'waitClose' ? `Cửa sổ còn mở sau ${fmtSec(s.timeoutMs)} → cổng Thất bại.`
          : `Chưa thấy cửa sổ sau ${fmtSec(s.timeoutMs)} → cổng Thất bại.${windowHasBox(op) ? ` Node sau dùng {{${s.ref}.output.left}}, top, w, h – Chụp màn hình chọn được khung cửa sổ này.` : ''}`}
        {op === 'close' && ' App có thể hỏi lưu – node không tự bấm.'}
      </span>
    </>
  );
}
