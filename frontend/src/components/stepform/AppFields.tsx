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
import { tr, useT } from '../../i18n';

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
  '': () => tr('ap.hint.check'),
  waitStart: (t) => tr('ap.hint.waitStart', { t }),
  waitQuit: (t) => tr('ap.hint.waitQuit', { t }),
  quit: (t) => tr('ap.hint.quit', { t }),
  forceQuit: () => tr('ap.hint.forceQuit'),
};

export function AppFields({ step: s }: { step: Step }) {
  const t = useT();
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
      <Field label={t('ap.do')} wide group>
        <Select value={op} onChange={(v) => set({ appOp: (v || undefined) as AppOp | undefined })} className={selectBox} aria-label={t('ap.opLabel')}
          options={APP_OPS.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      <Field label={t('ap.app')} wide group help={t('ap.appHelp')}>
        <VarTextInput {...varProps} value={name} onChange={(v) => set({ appName: v || undefined })} placeholder="notepad.exe" />
        {!name.trim() ? <span className={errText}>{t('ap.noName')}</span>
          : status && <span className={`text-xs ${status.running ? 'text-ok' : 'text-muted'}`}>
            {status.running ? t('ap.running', { w: status.windows ? t('ap.windows', { n: status.windows }) : t('ap.noWindow') }) : t('ap.notRunning')}
          </span>}
      </Field>
      <Field label={t('ap.match')} wide group help={t('ap.matchHelp')}>
        <Segmented value={s.appMatch ?? ''} full label={t('ap.match')} onChange={(v) => set({ appMatch: v || undefined })} options={WIN_MATCHES} />
      </Field>
      {inWails && (
        <div className="col-span-2 flex flex-col gap-1.5">
          <button onClick={() => { setPicking(!picking); if (!picking) load(); }}
            className="h-8 rounded-control border border-line text-[13px] text-ink hover:bg-hover">{picking ? t('ap.closeList') : t('ap.pickRunning')}</button>
          {picking && (apps || error) && <AppPicker apps={apps ?? []} error={error}
            onPick={(a) => { set({ appName: a.name, appMatch: 'exact' }); setPicking(false); }} onRefresh={load} />}
        </div>
      )}
      {op === 'quit' && <SwitchField label={t('ap.force')} on={!!s.appForce} onChange={(v) => set({ appForce: v || undefined })}
        help={t('ap.forceHelp')} />}
      {op !== '' && <NumField label={t('common.maxWait')} info={t('ap.waitInfo')} step={s} field="timeoutMs" unit="ms" min={0} />}
      <span className={`col-span-2 -mt-1 ${hint}`}>{OP_HINT[op](fmtSec(s.timeoutMs))}</span>
    </>
  );
}
