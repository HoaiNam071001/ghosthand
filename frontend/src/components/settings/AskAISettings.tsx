// Cài đặt – Hỏi AI (bước 31d): nhà cung cấp AI mặc định cho node Hỏi AI. Ô nào node để trống thì lấy ở đây
// (chỉ khi node cùng loại nhà cung cấp). Key chọn từ tab Bí mật – không nhập key thẳng.
import { useEffect, useState } from 'react';
import { GetSettings, SetAISettings } from '../../../wailsjs/go/app/App';
import { store } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import { tr, useLang } from '../../i18n';
import { AI_KINDS, isLocalAI, LOCAL_AI_URL } from '../../flow/askAI';
import { useSecretNames } from '../../store';
import { openSettings } from '../../settingsNav';
import Select from '../Select';

const input = 'rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus';
const keyRef = (name: string) => (name ? `{{secret.${name}}}` : '');
const refName = (key?: string) => /^\{\{secret\.([A-Za-z0-9_]+)\}\}$/.exec(key ?? '')?.[1] ?? '';

export default function AskAISettings({ onError }: { onError: (msg: string) => void }) {
  useLang();
  const [ai, setAi] = useState<store.AISettings>(store.AISettings.createFrom({}));
  const [saved, setSaved] = useState(false);
  const names = useSecretNames();
  useEffect(() => { GetSettings().then((s) => setAi(store.AISettings.createFrom(s.ai ?? {}))).catch((e) => onError(errorText(e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: Partial<store.AISettings>) => { setAi(store.AISettings.createFrom({ ...ai, ...patch })); setSaved(false); };
  const save = () => SetAISettings(ai).then((s) => { setAi(s); setSaved(true); onError(''); }).catch((e) => onError(errorText(e)));
  const local = isLocalAI(ai.baseUrl);
  const key = refName(ai.key);
  return (
    <>
      <span className="font-semibold">{tr('askai.title')}</span>
      <span className="text-xs text-muted">
        {tr('askai.descA')}<b>{tr('askai.descB')}</b>{tr('askai.descC')}
      </span>
      <label className="flex flex-col gap-1">{tr('askai.provider')}
        <Select value={ai.kind ?? ''} className={`${input} w-full`} aria-label={tr('askai.providerAria')} onChange={(kind) => set({ kind })}
          options={AI_KINDS.map((k) => ({ value: k.id, label: k.label }))} />
      </label>
      <label className="flex flex-col gap-1">{tr('askai.address')} <span className="text-xs text-muted">{tr('askai.addressHint', { url: LOCAL_AI_URL })}</span>
        <input value={ai.baseUrl ?? ''} onChange={(e) => set({ baseUrl: e.target.value })} placeholder={LOCAL_AI_URL} aria-label={tr('askai.addressAria')} className={`${input} font-mono`} spellCheck={false} />
      </label>
      <label className="flex flex-col gap-1">{tr('askai.model')} <span className="text-xs text-muted">{tr('askai.modelHint')}</span>
        <input value={ai.model ?? ''} onChange={(e) => set({ model: e.target.value })} aria-label={tr('askai.modelAria')} className={`${input} font-mono`} spellCheck={false} />
      </label>
      <label className="flex flex-col gap-1">{tr('askai.key')}
        <Select value={key} className={`${input} w-full`} aria-label={tr('askai.keyAria')} placeholder={key ? tr('askai.keyMissing', { key }) : tr('askai.noKey')}
          onChange={(n) => set({ key: keyRef(n) })}
          options={[{ value: '', label: local ? tr('askai.noKeyLocal') : tr('askai.noKey') }, ...names.map((n) => ({ value: n, label: n }))]} />
        <span className="text-xs text-muted">{tr('askai.keyHintA')}<button className="underline" onClick={() => openSettings('secrets')}>{tr('askai.keyHintB')}</button></span>
      </label>
      <div className="flex items-center gap-2">
        <button onClick={save} className="btn-primary rounded-control px-3 py-1.5">{tr('askai.save')}</button>
        {saved && <span className="text-xs text-muted">{tr('askai.saved')}</span>}
      </div>
    </>
  );
}
