// Trang Cài đặt trong trang Tệp (bước 63; trước là hộp thoại mở bằng bánh răng): menu dọc ít mục (settings/SettingsNav), mục gom nhiều phần thì có tab ngang.
// Các phần: Lưu trữ – thư mục kịch bản / ảnh (bước 41, settings/StorageSettings), Màn hình – cạnh đặt thanh overlay (bước 49) + viền lúc đang chạy (58 D5, settings/OverlaySettings), Trình duyệt – Chrome của app / Wisp cho node web (bước 62, settings/WebBrowserSettings),
// Bí mật – kho mật khẩu / token (bước 43 S10, settings/SecretsSettings), Quyền – quyền hệ điều hành (bước 48, settings/PermSettings), API – dòng lệnh + API local (bước 22, settings/ApiSettings), AI qua MCP (bước 31, settings/McpSettings), MCP server – server ngoài node Gọi tool MCP dùng (bước 55, settings/McpServersSettings), Đồng bộ – Google Drive (bước 54, settings/SyncSettings), Giới thiệu – phiên bản + kiểm tra bản mới (settings/AboutSettings).
// Mở ở tab nào / mục nào: shellStore (openSettings trong settingsNav.ts).
import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import {
  GetSettings, OpenFolder, PickFolder, SetAPISettings, SetMCPSettings, SetOverlaySettings, SetStorageSettings, SetWebSettings, StorageDefaults, WispStatus,
} from '../../wailsjs/go/app/App';
import { store, wisp } from '../../wailsjs/go/models';
import { errorText } from '../engineStore';
import { needs } from '../flow/perms';
import { setSettingsTab, useShell } from '../shellStore';
import { openPermSettings, refreshPerms, requestPerm, usePerms } from '../store/permStore';
import { useScript } from '../store/editor';
import { checkUpdate, installUpdate, loadVersion, openReleasePage, useUpdate } from '../store/updateStore';
import AboutSettings from './settings/AboutSettings';
import ApiSettings from './settings/ApiSettings';
import AskAISettings from './settings/AskAISettings';
import McpServersSettings from './settings/McpServersSettings';
import McpSettings from './settings/McpSettings';
import OverlaySettings from './settings/OverlaySettings';
import PermSettings from './settings/PermSettings';
import SecretsSettings from './settings/SecretsSettings';
import SyncSettings from './settings/SyncSettings';
import UiSettings from './settings/UiSettings';
import StorageSettings, { StorageKey } from './settings/StorageSettings';
import WebBrowserSettings from './settings/WebBrowserSettings';
import SettingsNav, { pageOf } from './settings/SettingsNav';
import { TabBtn } from './stepform/shared';

export default function AppSettings() {
  const { settingsTab: tab, settingsFocus: focusId } = useShell();
  const [settings, setSettings] = useState<store.Settings | null>(null);
  const [error, setError] = useState('');
  const perms = usePerms();
  const upd = useUpdate();
  const script = useScript();
  const [defaults, setDefaults] = useState<store.StorageDefaults | null>(null);
  const page = pageOf(tab);
  const t = useT();

  useEffect(() => {
    // Promise.resolve().then: trình duyệt (#demo) không có Go → lỗi thành thông báo thay vì làm sập cả màn
    Promise.resolve().then(GetSettings).then(setSettings).catch((e) => setError(errorText(e)));
    Promise.resolve().then(StorageDefaults).then(setDefaults).catch((e) => setError(errorText(e)));
  }, []);
  useEffect(() => {
    if (tab !== 'perms') return;
    // cấp quyền xong ở System Settings rồi quay lại app → tự kiểm tra lại
    refreshPerms();
    window.addEventListener('focus', refreshPerms);
    return () => window.removeEventListener('focus', refreshPerms);
  }, [tab]);
  useEffect(() => { if (tab === 'about') loadVersion(); }, [tab]);
  const [wispState, setWispState] = useState<wisp.State | null>(null);
  const refreshWisp = () => { setWispState(null); Promise.resolve().then(WispStatus).then(setWispState).catch((e) => setError(errorText(e))); };
  useEffect(() => { if (tab === 'browser') refreshWisp(); }, [tab]);
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
  const saveOverlay = (patch: Partial<store.OverlaySettings>) => {
    if (!settings) return;
    const overlay = store.OverlaySettings.createFrom({ ...settings.overlay, ...patch });
    setSettings(store.Settings.createFrom({ ...settings, overlay }));
    SetOverlaySettings(overlay).then(() => setError('')).catch((e) => setError(errorText(e)));
  };
  const saveWeb = (patch: Partial<store.WebSettings>) => {
    if (!settings) return;
    const web = store.WebSettings.createFrom({ ...settings.web, ...patch });
    setSettings(store.Settings.createFrom({ ...settings, web }));
    SetWebSettings(web).then(() => setError('')).catch((e) => setError(errorText(e)));
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

  const section = (t: typeof tab) => {
    switch (t) {
      case 'ui': return <UiSettings />;
      case 'storage': return <StorageSettings storage={settings!.storage ?? {}} defaults={defaults} onPick={pick} onOpen={openDir} onReset={(key) => saveStorage(key, '')} />;
      case 'overlay': return <OverlaySettings overlay={settings!.overlay ?? {}} onChange={saveOverlay} />;
      case 'browser': return <WebBrowserSettings web={settings!.web ?? {}} status={wispState} onChange={saveWeb} onRefresh={refreshWisp} />;
      case 'secrets': return <SecretsSettings onError={setError} />;
      case 'perms': return <PermSettings items={perms.items} needed={needs(script)} focus={focusId} busy={perms.busy} error={perms.error}
        onRefresh={refreshPerms} onRequest={requestPerm} onOpen={openPermSettings} />;
      case 'api': return <ApiSettings api={settings!.api} onChange={saveApi} />;
      case 'mcp': return <McpSettings mcp={settings!.mcp} onChange={saveMcp} />;
      case 'askai': return <AskAISettings onError={setError} />;
      case 'servers': return <McpServersSettings onError={setError} />;
      case 'sync': return <SyncSettings />;
      case 'about': return <AboutSettings version={upd.version} info={upd.info} busy={upd.busy} error={upd.error} progress={upd.progress} onCheck={checkUpdate} onOpen={openReleasePage} onInstall={installUpdate} />;
    }
  };

  return (
    <div className="flex h-full min-h-0 max-w-[920px] flex-col gap-3 text-[13px] text-ink">
      <h2 className="text-xl font-semibold">{t('st.title')}</h2>
      <div className="flex min-h-0 flex-1 gap-4">
        <SettingsNav page={page} onChange={(p) => setSettingsTab(p.sections[0].id)} />
        <div key={tab} className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {page.sections.length > 1 && (
            <div className="flex flex-none gap-4 border-b border-line" role="tablist" aria-label={t(page.key)}>
              {page.sections.map((sec) => <TabBtn key={sec.id} active={tab === sec.id} onClick={() => setSettingsTab(sec.id)}>{t(sec.key)}</TabBtn>)}
            </div>
          )}
          {settings ? section(tab) : <span className="text-muted">{t('st.loading')}</span>}
          {error && <span className="text-danger-text">{error}</span>}
        </div>
      </div>
    </div>
  );
}
