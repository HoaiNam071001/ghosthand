// Cài đặt → Đồng bộ (bước 54 C8): nối Go (đăng nhập Google, phạm vi, cụm mật khẩu) với SyncPanel (chỉ hiển thị).
import { useEffect, useState } from 'react';
import { ClearSyncPassphrase, GetSyncSettings, SetSyncPassphrase, SetSyncSettings, SyncLogin, SyncLogout, SyncNow } from '../../../wailsjs/go/app/App';
import { store } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import { refreshSyncStatus, useSyncStatus } from '../../syncState';
import SyncPanel, { SyncCfg } from '../sync/SyncPanel';

const fromGo = (s: store.SyncSettings): SyncCfg => ({
  scripts: !!s.scripts, settings: !!s.settings, secrets: !!s.secrets, onOpen: !!s.onOpen, onSave: !!s.onSave, intervalMin: s.intervalMin ?? 0, device: s.device ?? '',
});

export default function SyncSettings() {
  const status = useSyncStatus();
  const [cfg, setCfg] = useState<SyncCfg>(fromGo(store.SyncSettings.createFrom({})));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => GetSyncSettings().then((s) => setCfg(fromGo(s))).catch((e) => setError(errorText(e)));
  useEffect(() => { load(); }, [status.loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (p: Promise<unknown>) => p.then(() => setError('')).catch((e) => setError(errorText(e))).finally(() => { void refreshSyncStatus(); });
  const login = () => {
    setBusy(true);
    void run(SyncLogin()).finally(() => setBusy(false));
  };
  const patch = (p: Partial<SyncCfg>) => {
    const next = { ...cfg, ...p };
    setCfg(next);
    run(SetSyncSettings(store.SyncSettings.createFrom(next))).then(load);
  };
  const setPass = (pass: string, rotate: boolean) =>
    SetSyncPassphrase(pass, rotate)
      .then(() => { if (rotate) void SyncNow().catch(() => undefined); return ''; })
      .catch((e) => errorText(e))
      .finally(() => { void refreshSyncStatus(); });

  return (
    <SyncPanel status={status} cfg={cfg} busy={busy} error={error} onLogin={login} onLogout={() => run(SyncLogout())} onNow={() => run(SyncNow())} onCfg={patch}
      secrets={{ hasPassphrase: status.hasPassphrase, onSetPassphrase: setPass, onClearPassphrase: () => run(ClearSyncPassphrase()).then(load) }} />
  );
}
