// Node Chụp màn hình (bước 35 N1): vùng chụp (ShotAreaField – dùng chung với Chờ màn hình), thư mục / tên file (nhận {{biến}}), chép vào clipboard.
import Select from '../Select';
import { useEffect, useState } from 'react';
import { Displays } from '../../../wailsjs/go/app/App';
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
import { tr, useT } from '../../i18n';

type Display = { index: number; rect: Rect; main: boolean };

export function ShotFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  return (
    <>
      <ShotAreaField step={s} label={t('shot.cap')} />
      <Field label={t('shot.dir')} wide group help={t('shot.dirHelp')}>
        <PathInput kind="folder" {...varProps} value={s.saveDir ?? ''} onChange={(v) => set({ saveDir: v || undefined })} placeholder={t('shot.dirPh')} />
      </Field>
      <Field label={t('shot.name')} wide group help={t('shot.nameHelp')}>
        <VarTextInput {...varProps} value={s.fileName ?? ''} onChange={(v) => set({ fileName: v || undefined })} placeholder={t('shot.namePh')} />
      </Field>
      <SwitchField label={t('shot.clip')} help={t('shot.clipHelp')} on={!!s.toClipboard} onChange={(on) => set({ toClipboard: on || undefined })} />
    </>
  );
}

// Vùng chụp (dùng chung với Chờ màn hình): vùng kịch bản / cả màn / vùng cố định / chỗ node trước thấy.
export function ShotAreaField({ step: s, label }: { step: Step; label: string }) {
  const t = useT();
  const script = useScript();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const area = s.shotArea ?? '';
  return (
    <Field label={label} wide group>
      <Select value={area as string} className={selectBox} aria-label={t('shot.areaLabel')}
        onChange={(v) => set({ shotArea: (v || undefined) as ShotArea | undefined })}
        options={SHOT_AREAS.map((a) => ({ value: a.id as string, label: a.label }))} />
      {area === '' && <span className={hint}>{script.region
        ? t('shot.scriptRegion', { w: script.region.w, h: script.region.h, x: script.region.x, y: script.region.y })
        : t('shot.noRegion')}</span>}
      {area === 'screen' && <DisplayPicker value={s.display ?? 0} onChange={(display) => set({ display: display || undefined })} />}
      {area === 'rect' && <RectPicker step={s} onChange={(shotRect) => set({ shotRect })} />}
      {area === 'node' && <NodePicker step={s} onChange={(imageFrom) => set({ imageFrom })} />}
    </Field>
  );
}

// Chọn màn: 0 = zero (màn chứa vùng kịch bản / chứa cửa sổ), n = màn thứ n.
export function DisplayPicker({ value, onChange, zero }: { value: number; onChange: (n: number) => void; zero?: string }) {
  const t = useT();
  zero ??= t('shot.zero');
  const [ds, setDs] = useState<Display[]>([]);
  useEffect(() => { if (inWails) Displays().then(setDs).catch(() => {}); }, []);
  const known = value === 0 || value <= ds.length;
  return (
    <>
      <Select value={String(value)} onChange={(v) => onChange(Number(v))} className={selectBox} aria-label={t('shot.display')}
        options={[{ value: '0', label: zero },
          ...ds.map((d) => ({ value: String(d.index + 1), label: `${t('shot.dispN', { n: d.index + 1 })}${d.main ? ' ' + t('shot.main') : ''} · ${d.rect.w} × ${d.rect.h}` })),
          ...(known ? [] : [{ value: String(value), label: t('shot.dispMissing', { n: value }) }])]} />
      {!known && <span className="text-xs text-danger-text">{t('shot.dispErr', { n: value })}</span>}
    </>
  );
}

function RectPicker({ step: s, onChange }: { step: Step; onChange: (r: Rect) => void }) {
  const t = useT();
  const r = s.shotRect ?? { x: 0, y: 0, w: 0, h: 0 };
  const num = (k: keyof Rect, prefix: string, min?: number) => (
    <NumInput prefix={prefix} value={r[k]} min={min} signed={min === undefined} onChange={(v) => onChange({ ...r, [k]: v })} className="flex-1" />
  );
  return (
    <>
      <div className="flex gap-2">{num('x', 'X')}{num('y', 'Y')}</div>
      <div className="flex gap-2">{num('w', 'W', 1)}{num('h', 'H', 1)}</div>
      <button onClick={() => startCapture(s.id)} className="flex h-8 items-center justify-center gap-2 rounded-control border border-line text-ink hover:bg-hover">
        <Region className="h-3.5 w-3.5" />{t('shot.select')}
      </button>
      <span className={`text-xs ${r.w > 0 && r.h > 0 ? 'text-muted' : 'text-danger-text'}`}>
        {r.w > 0 && r.h > 0 ? t('shot.rectOk') : t('shot.rectNone')}
      </span>
    </>
  );
}

function NodePicker({ step: s, onChange }: { step: Step; onChange: (id: string | undefined) => void }) {
  const t = useT();
  const { steps } = useScript();
  const sources = steps.filter((x) => x.id !== s.id && hasFoundBox(x));
  const src = sources.find((x) => x.id === s.imageFrom);
  return (
    <>
      <Select value={src ? src.id : ''} onChange={(v) => onChange(v || undefined)} aria-label={t('shot.nodeLabel')}
        className={`${selectBox} ${src ? '' : 'border-danger'}`} placeholder={t('shot.nodePh')}
        options={sources.map((x) => ({ value: x.id, label: `${x.ref} · ${nodeTitle(x)}` }))} />
      <span className={`text-xs ${src ? 'text-muted' : 'text-danger-text'}`}>
        {src ? t('shot.nodeOk', { ref: src.ref })
          : sources.length ? t('shot.nodePick') : t('shot.nodeNone')}
      </span>
    </>
  );
}
