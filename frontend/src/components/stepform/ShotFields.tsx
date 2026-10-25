// Node Chụp màn hình (bước 35 N1): vùng chụp (ShotAreaField – dùng chung với Chờ màn hình), thư mục / tên file (nhận {{biến}}), chép vào clipboard.
import Select from '../Select';
import { useEffect, useState } from 'react';
import { Displays } from '../../../wailsjs/go/main/App';
import NumInput from '../NumInput';
import { Region } from '../icons';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { startCapture } from '../../imageSteps';
import { inWails } from '../../windowMode';
import { nodeTitle } from '../../flow/view';
import { hasFoundBox, SHOT_AREAS, type ShotArea } from '../../flow/shot';
import { Rect, Step } from '../../types';
import { Field, hint, selectBox, SwitchField, useNodeVars } from './shared';

type Display = { index: number; rect: Rect; main: boolean };

export function ShotFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <ShotAreaField step={s} label="Chụp" />
      <Field label="Thư mục lưu" wide group help="Trống = thư mục ảnh trong Cài đặt → Lưu trữ (mặc định Pictures/Ghosthand) · chưa có thì tự tạo">
        <PathInput kind="folder" {...varProps} value={s.saveDir ?? ''} onChange={(v) => set({ saveDir: v || undefined })} placeholder="Thư mục ảnh trong Cài đặt" />
      </Field>
      <Field label="Tên file" wide group help="Tự thêm .png · trùng tên thì thêm (2), không ghi đè">
        <VarTextInput {...varProps} value={s.fileName ?? ''} onChange={(v) => set({ fileName: v || undefined })} placeholder="ghosthand-<ngày>-<giờ>" />
      </Field>
      <SwitchField label="Vào clipboard" help="Dán (Cmd/Ctrl+V) thẳng vào chat, email, Paint…" on={!!s.toClipboard} onChange={(on) => set({ toClipboard: on || undefined })} />
    </>
  );
}

// Vùng chụp (dùng chung với Chờ màn hình): vùng kịch bản / cả màn / vùng cố định / chỗ node trước thấy.
export function ShotAreaField({ step: s, label }: { step: Step; label: string }) {
  const script = useScript();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const area = s.shotArea ?? '';
  return (
    <Field label={label} wide group>
      <Select value={area as string} className={selectBox} aria-label="Vùng chụp"
        onChange={(v) => set({ shotArea: (v || undefined) as ShotArea | undefined })}
        options={SHOT_AREAS.map((a) => ({ value: a.id as string, label: a.label }))} />
      {area === '' && <span className={hint}>{script.region
        ? `Vùng của kịch bản: ${script.region.w} × ${script.region.h} tại ${script.region.x}, ${script.region.y}`
        : 'Kịch bản chưa đặt vùng – cả màn chính'}</span>}
      {area === 'screen' && <DisplayPicker value={s.display ?? 0} onChange={(display) => set({ display: display || undefined })} />}
      {area === 'rect' && <RectPicker step={s} onChange={(shotRect) => set({ shotRect })} />}
      {area === 'node' && <NodePicker step={s} onChange={(imageFrom) => set({ imageFrom })} />}
    </Field>
  );
}

// Chọn màn: 0 = zero (màn chứa vùng kịch bản / chứa cửa sổ), n = màn thứ n.
export function DisplayPicker({ value, onChange, zero = 'Màn chứa vùng kịch bản' }: { value: number; onChange: (n: number) => void; zero?: string }) {
  const [ds, setDs] = useState<Display[]>([]);
  useEffect(() => { if (inWails) Displays().then(setDs).catch(() => {}); }, []);
  const known = value === 0 || value <= ds.length;
  return (
    <>
      <Select value={String(value)} onChange={(v) => onChange(Number(v))} className={selectBox} aria-label="Màn hình"
        options={[{ value: '0', label: zero },
          ...ds.map((d) => ({ value: String(d.index + 1), label: `Màn ${d.index + 1}${d.main ? ' (chính)' : ''} · ${d.rect.w} × ${d.rect.h}` })),
          ...(known ? [] : [{ value: String(value), label: `Màn ${value} (không thấy trên máy này)` }])]} />
      {!known && <span className="text-xs text-danger-text">Máy này không có màn {value} – chạy sẽ báo lỗi</span>}
    </>
  );
}

function RectPicker({ step: s, onChange }: { step: Step; onChange: (r: Rect) => void }) {
  const r = s.shotRect ?? { x: 0, y: 0, w: 0, h: 0 };
  const num = (k: keyof Rect, prefix: string, min?: number) => (
    <NumInput prefix={prefix} value={r[k]} min={min} signed={min === undefined} onChange={(v) => onChange({ ...r, [k]: v })} className="flex-1" />
  );
  return (
    <>
      <div className="flex gap-2">{num('x', 'X')}{num('y', 'Y')}</div>
      <div className="flex gap-2">{num('w', 'W', 1)}{num('h', 'H', 1)}</div>
      <button onClick={() => startCapture(s.id)} className="flex h-8 items-center justify-center gap-2 rounded-control border border-line text-ink hover:bg-hover">
        <Region className="h-3.5 w-3.5" />Khoanh trên màn hình…
      </button>
      <span className={`text-xs ${r.w > 0 && r.h > 0 ? 'text-muted' : 'text-danger-text'}`}>
        {r.w > 0 && r.h > 0 ? 'Toạ độ màn hình – không đổi theo vùng của kịch bản' : 'Chưa chọn vùng – chạy sẽ báo lỗi'}
      </span>
    </>
  );
}

function NodePicker({ step: s, onChange }: { step: Step; onChange: (id: string | undefined) => void }) {
  const { steps } = useScript();
  const sources = steps.filter((x) => x.id !== s.id && hasFoundBox(x));
  const src = sources.find((x) => x.id === s.imageFrom);
  return (
    <>
      <Select value={src ? src.id : ''} onChange={(v) => onChange(v || undefined)} aria-label="Node lấy khung chụp"
        className={`${selectBox} ${src ? '' : 'border-danger'}`} placeholder="— chọn node có chỗ thấy —"
        options={sources.map((x) => ({ value: x.id, label: `${x.ref} · ${nodeTitle(x)}` }))} />
      <span className={`text-xs ${src ? 'text-muted' : 'text-danger-text'}`}>
        {src ? `Chụp đúng khung ${src.ref} thấy lần gần nhất trong vòng – ${src.ref} chưa thấy thì node này thất bại`
          : sources.length ? 'Chọn node để lấy khung chụp' : 'Chưa có node Chờ ảnh / chữ hay phần tử web nào'}
      </span>
    </>
  );
}
