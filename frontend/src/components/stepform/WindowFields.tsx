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
import { useT } from '../../i18n';

// Danh sách cửa sổ đang mở – tải khi cần (mở danh sách / lấy khung), không tự làm mới.
function useWindows() {
  const [wins, setWins] = useState<WindowInfo[] | null>(null);
  const [error, setError] = useState<string>();
  const load = useCallback(() => ListWindows().then((l) => { setWins(l ?? []); setError(undefined); return l ?? []; })
    .catch((e) => { setError(errorText(e)); return [] as WindowInfo[]; }), []);
  return { wins, error, load };
}

export function WindowFields({ step: s }: { step: Step }) {
  const t = useT();
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
    if (!w || w.minimized) return setNote(w ? t('wf.minimized') : t('wf.notFound'));
    setNote(undefined);
    set({ winRect: { ...w.box } });
  };
  const pick = (w: WindowInfo) => { set({ winApp: w.app, winTitle: w.title }); setPicking(false); };

  return (
    <>
      <Field label={t('ap.do')} wide group>
        <Select value={op} onChange={(v) => set({ winOp: (v || undefined) as WinOp | undefined })} className={selectBox} aria-label={t('wf.opLabel')}
          options={WIN_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      <Field label={t('ap.app')} wide group help={t('wf.appHelp')}>
        <VarTextInput {...varProps} value={s.winApp ?? ''} onChange={(v) => set({ winApp: v || undefined })} placeholder="chrome" />
      </Field>
      <Field label={t('wf.title')} wide group help={t('wf.titleHelp')}>
        <VarTextInput {...varProps} value={s.winTitle ?? ''} onChange={(v) => set({ winTitle: v || undefined })} placeholder={t('wf.titlePh')} />
        {empty && <span className={errText}>{t('wf.empty')}</span>}
      </Field>
      <Field label={t('ap.match')} wide group help={t('wf.matchHelp')}>
        <Segmented value={s.winMatch ?? ''} full label={t('ap.match')} onChange={(v) => set({ winMatch: v || undefined })} options={WIN_MATCHES} />
      </Field>
      {inWails && (
        <div className="col-span-2 flex flex-col gap-1.5">
          <button onClick={() => { setPicking(!picking); if (!picking) load(); }}
            className="h-8 rounded-control border border-line text-[13px] text-ink hover:bg-hover">{picking ? t('ap.closeList') : t('wf.pickOpen')}</button>
          {picking && (wins || error) && <WindowPicker wins={wins ?? []}error={error} onPick={pick} onRefresh={load} />}
        </div>
      )}
      {op === 'setBounds' && <BoundsFields step={s} onTakeCurrent={inWails ? takeCurrent : undefined} note={note} />}
      <NumField label={t('common.maxWait')} info={t(op === 'waitClose' ? 'wf.waitInfoClose' : 'wf.waitInfoOpen')} step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {op === 'waitClose' ? t('wf.hintClose', { t: fmtSec(s.timeoutMs) })
          : t('wf.hintOpen', { t: fmtSec(s.timeoutMs) }) + (windowHasBox(op) ? ' ' + t('wf.hintBox', { ref: s.ref }) : '')}
        {op === 'close' && ' ' + t('wf.hintSave')}
      </span>
    </>
  );
}
