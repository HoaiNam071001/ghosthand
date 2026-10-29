// Cài đặt – Hỏi AI (bước 31d): nhà cung cấp AI mặc định cho node Hỏi AI. Ô nào node để trống thì lấy ở đây
// (chỉ khi node cùng loại nhà cung cấp). Key chọn từ tab Bí mật – không nhập key thẳng.
import { useEffect, useState } from 'react';
import { GetSettings, SetAISettings } from '../../../wailsjs/go/main/App';
import { store } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import { AI_KINDS, isLocalAI, LOCAL_AI_URL } from '../../flow/askAI';
import { useSecretNames } from '../../store';
import { openSettings } from '../../settingsNav';
import Select from '../Select';

const input = 'rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus';
const keyRef = (name: string) => (name ? `{{secret.${name}}}` : '');
const refName = (key?: string) => /^\{\{secret\.([A-Za-z0-9_]+)\}\}$/.exec(key ?? '')?.[1] ?? '';

export default function AskAISettings({ onError }: { onError: (msg: string) => void }) {
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
      <span className="font-semibold">Hỏi AI</span>
      <span className="text-xs text-muted">
        Nhà cung cấp mặc định cho node <b>Hỏi AI</b>: node để trống loại / địa chỉ / model / key thì dùng ở đây (node chọn loại khác thì không thừa hưởng).
        Mỗi lần chạy có thể tốn tiền và ảnh màn hình gửi cho nhà cung cấp, trừ AI chạy trên máy.
      </span>
      <label className="flex flex-col gap-1">Nhà cung cấp
        <Select value={ai.kind ?? ''} className={`${input} w-full`} aria-label="Nhà cung cấp AI" onChange={(kind) => set({ kind })}
          options={AI_KINDS.map((k) => ({ value: k.id, label: k.label }))} />
      </label>
      <label className="flex flex-col gap-1">Địa chỉ <span className="text-xs text-muted">Trống = địa chỉ chính thức của hãng · AI trên máy: {LOCAL_AI_URL}</span>
        <input value={ai.baseUrl ?? ''} onChange={(e) => set({ baseUrl: e.target.value })} placeholder={LOCAL_AI_URL} aria-label="Địa chỉ AI" className={`${input} font-mono`} spellCheck={false} />
      </label>
      <label className="flex flex-col gap-1">Model <span className="text-xs text-muted">Trống = model mặc định của hãng</span>
        <input value={ai.model ?? ''} onChange={(e) => set({ model: e.target.value })} aria-label="Model AI" className={`${input} font-mono`} spellCheck={false} />
      </label>
      <label className="flex flex-col gap-1">Key
        <Select value={key} className={`${input} w-full`} aria-label="Key AI" placeholder={key ? `${key} (chưa có trong Bí mật)` : '(không dùng key)'}
          onChange={(n) => set({ key: keyRef(n) })}
          options={[{ value: '', label: local ? '(không cần key – AI trên máy)' : '(không dùng key)' }, ...names.map((n) => ({ value: n, label: n }))]} />
        <span className="text-xs text-muted">Lưu key ở tab Bí mật rồi chọn ở đây. <button className="underline" onClick={() => openSettings('secrets')}>Mở tab Bí mật</button></span>
      </label>
      <div className="flex items-center gap-2">
        <button onClick={save} className="btn-primary rounded-control px-3 py-1.5">Lưu</button>
        {saved && <span className="text-xs text-muted">Đã lưu</span>}
      </div>
    </>
  );
}
