// Cài đặt app (nút bánh răng trên thanh tiêu đề), chia tab: Lưu trữ – thư mục kịch bản / ảnh (bước 41, settings/StorageSettings),
// Bí mật – kho mật khẩu / token (bước 43 S10, settings/SecretsSettings), Quyền – quyền hệ điều hành (bước 48, settings/PermSettings), API – dòng lệnh + API local (bước 22, settings/ApiSettings), AI qua MCP (bước 31, settings/McpSettings), Giới thiệu – phiên bản + kiểm tra bản mới (settings/AboutSettings).
import { useEffect, useState } from 'react';
import {
  GetSettings, OpenFolder, PickFolder, SetAPISettings, SetMCPSettings, SetStorageSettings, StorageDefaults,
} from '../../wailsjs/go/main/App';
import { store } from '../../wailsjs/go/models';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { errorText } from '../engineStore';
import { Gear } from './icons';
import { needs } from '../flow/perms';
import { onOpenSettings, SettingsTab } from '../settingsNav';
import { openPermSettings, refreshPerms, requestPerm, usePerms } from '../store/permStore';
import { useScript } from '../store/editor';
import { checkUpdate, loadVersion, openReleasePage, useUpdate } from '../store/updateStore';
import AboutSettings from './settings/AboutSettings';
import ApiSettings from './settings/ApiSettings';
import McpSettings from './settings/McpSettings';
import PermSettings from './settings/PermSettings';
import SecretsSettings from './settings/SecretsSettings';
import StorageSettings, { StorageKey } from './settings/StorageSettings';
import Segmented from './Segmented';

type Tab = SettingsTab;
const TABS: { id: Tab; label: string }[] = [{ id: 'storage', label: 'Lưu trữ' }, { id: 'secrets', label: 'Bí mật' }, { id: 'perms', label: 'Quyền' }, { id: 'api', label: 'API' }, { id: 'mcp', label: 'AI (MCP)' }, { id: 'about', label: 'Giới thiệu' }];

export default function AppSettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<store.Settings | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('storage');
  const perms = usePerms();
  const upd = useUpdate();
  const script = useScript();
  const [defaults, setDefaults] = useState<store.StorageDefaults | null>(null);

  const show = () => {
    GetSettings().then(setSettings).catch((e) => setError(errorText(e)));
    StorageDefaults().then(setDefaults).catch((e) => setError(errorText(e)));
    setOpen(true);
  };
  const [focusId, setFocusId] = useState('');
  const toggle = () => (open ? setOpen(false) : show());
  useEffect(() => onOpenSettings((t, f) => { setTab(t); setFocusId(f ?? ''); show(); }), []);
  useEffect(() => {
    if (!open || tab !== 'perms') return;
    // cấp quyền xong ở System Settings rồi quay lại app → tự kiểm tra lại
    refreshPerms();
    window.addEventListener('focus', refreshPerms);
    return () => window.removeEventListener('focus', refreshPerms);
  }, [open, tab]);
  useEffect(() => { if (open && tab === 'about') loadVersion(); }, [open, tab]);
  useEffect(() => {
    if (!open) return;
    // AI đổi ưu tiên node lúc đang mở Cài đặt (44) – cập nhật để lần lưu sau không ghi đè bằng giá trị cũ
    const off = EventsOn('mcp:nodePref', (nodePref: string) =>
      setSettings((s) => s && store.Settings.createFrom({ ...s, mcp: { ...s.mcp, nodePref } })));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => { off(); window.removeEventListener('keydown', onKey); };
  }, [open]);
  const saveApi = (patch: Partial<store.APISettings>) => {
    if (!settings) return;
    const api = store.APISettings.createFrom({ ...settings.api, ...patch });
    setSettings(store.Settings.createFrom({ ...settings, api }));
    SetAPISettings(api).then((saved) => { setSettings((s) => s && store.Settings.createFrom({ ...s, api: saved })); setError(''); })
      .catch((e) => setError(errorText(e)));
  };
  const saveMcp = (patch: Partial<store.MCPSettings>) => {
    if (!settings) return;
    const mcp = store.MCPSettings.createFrom({ ...settings.mcp, ...patch });
    setSettings(store.Settings.createFrom({ ...settings, mcp }));
    SetMCPSettings(mcp).then(() => setError('')).catch((e) => setError(errorText(e)));
  };
  const saveStorage = (key: StorageKey, dir: string) => {
    if (!settings) return;
    const storage = store.StorageSettings.createFrom({ ...settings.storage, [key]: dir });
    SetStorageSettings(storage).then(() => { setSettings((s) => s && store.Settings.createFrom({ ...s, storage })); setError(''); })
      .catch((e) => setError(errorText(e)));
  };
  const pick = (key: StorageKey, from: string) =>
    PickFolder('Chọn thư mục', from).then((dir) => dir && saveStorage(key, dir)).catch((e) => setError(errorText(e)));
  const openDir = (dir: string) => OpenFolder(dir).then(() => setError('')).catch((e) => setError(errorText(e)));

  return (
    <>
      <button onClick={toggle} aria-label="Cài đặt" title="Cài đặt" aria-haspopup="dialog" aria-expanded={open}
        className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink"><Gear /></button>
      {open && settings && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/25 px-4 pt-[6vh]" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Cài đặt" className="flex max-h-[88vh] w-[440px] max-w-full flex-col gap-3 overflow-y-auto rounded-panel border border-line bg-surface p-[18px] text-[13px] text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">Cài đặt</div>
              <button onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-ink">✕</button>
            </div>
            <Segmented value={tab} options={TABS} onChange={setTab} label="Nhóm cài đặt" full />
            {tab === 'storage' && (
              <StorageSettings storage={settings.storage ?? {}} defaults={defaults} onPick={pick} onOpen={openDir} onReset={(key) => saveStorage(key, '')} />
            )}
            {tab === 'secrets' && <SecretsSettings onError={setError} />}
            {tab === 'perms' && (
              <PermSettings items={perms.items} needed={needs(script)} focus={focusId} busy={perms.busy} error={perms.error}
                onRefresh={refreshPerms} onRequest={requestPerm} onOpen={openPermSettings} />
            )}
            {tab === 'api' && <ApiSettings api={settings.api} onChange={saveApi} />}
            {tab === 'mcp' && <McpSettings mcp={settings.mcp} onChange={saveMcp} />}
            {tab === 'about' && <AboutSettings version={upd.version} info={upd.info} busy={upd.busy} error={upd.error} onCheck={checkUpdate} onOpen={openReleasePage} />}
            {error && <span className="text-danger-text">{error}</span>}
          </div>
        </div>
      )}
    </>
  );
}
