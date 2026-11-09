// Cài đặt → Đồng bộ (bước 54 C8/C9): nối Go (đăng nhập Google / MCP server, phạm vi, cụm mật khẩu) với SyncPanel (chỉ hiển thị).
import { useEffect, useState } from 'react';
import {
  CheckSyncMCP, ClearSyncPassphrase, GetSyncSettings, ListMCPServers, SetSyncPassphrase, SetSyncSettings, SyncLogin, SyncLogout, SyncMCPPresets, SyncNow,
} from '../../../wailsjs/go/app/App';
import { mcpmap, store } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import { EMPTY_MCP_MAP, McpMap, McpPreset, McpServerOpt, SyncBackend } from '../../sync/types';
import { refreshSyncStatus, useSyncStatus } from '../../syncState';
import SyncPanel, { SyncCfg } from '../sync/SyncPanel';

const fromGo = (s: store.SyncSettings): SyncCfg => ({
  scripts: !!s.scripts, settings: !!s.settings, secrets: !!s.secrets, onOpen: !!s.onOpen, onSave: !!s.onSave, intervalMin: s.intervalMin ?? 0, device: s.device ?? '',
});
const mapFromGo = (m?: mcpmap.Mapping): McpMap => ({ ...EMPTY_MCP_MAP, ...(m ?? {}), deleteTool: m?.deleteTool ?? '', mkdirTool: m?.mkdirTool ?? '' });
const backendOf = (s: store.SyncSettings): SyncBackend => (s.backend === 'mcp' ? 'mcp' : 'gdrive');

export default function SyncSettings() {
  const status = useSyncStatus();
  const [cfg, setCfg] = useState<SyncCfg>(fromGo(store.SyncSettings.createFrom({})));
  const [saved, setSaved] = useState<{ backend: SyncBackend; mcp: McpMap }>({ backend: 'gdrive', mcp: EMPTY_MCP_MAP });
  const [draft, setDraft] = useState<{ backend: SyncBackend; mcp: McpMap }>({ backend: 'gdrive', mcp: EMPTY_MCP_MAP });
  const [servers, setServers] = useState<McpServerOpt[]>([]);
  const [presets, setPresets] = useState<McpPreset[]>([]);
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => GetSyncSettings().then((s) => {
    setCfg(fromGo(s));
    const r = { backend: backendOf(s), mcp: mapFromGo(s.mcp) };
    setSaved(r);
    setDraft(r);
  }).catch((e) => setError(errorText(e)));
  useEffect(() => { load(); }, [status.loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void ListMCPServers().then((l) => setServers(l.map((s) => ({ id: s.id, name: s.name, enabled: s.enabled })))).catch(() => undefined);
    void SyncMCPPresets().then((l) => setPresets(l.map((p) => ({ id: p.ID, name: p.Name, desc: p.Desc, mapping: mapFromGo(p.Mapping) })))).catch(() => undefined);
  }, []);

  const run = (p: Promise<unknown>) => p.then(() => setError('')).catch((e) => setError(errorText(e))).finally(() => { void refreshSyncStatus(); });
  const login = () => {
    setBusy(true);
    void run(SyncLogin()).finally(() => setBusy(false));
  };
  const toGo = (c: SyncCfg, r: { backend: SyncBackend; mcp: McpMap }) => store.SyncSettings.createFrom({ ...c, backend: r.backend, mcp: r.mcp });
  const patch = (p: Partial<SyncCfg>) => {
    const next = { ...cfg, ...p };
    setCfg(next);
    run(SetSyncSettings(toGo(next, saved))).then(load);
  };
  // Chuyển về Google Drive lưu ngay; sang MCP chỉ soạn tới khi bấm "Lưu và kiểm tra" (ánh xạ dở dang không lưu được).
  const setBackend = (b: SyncBackend) => {
    setCheck(null);
    if (b === 'gdrive') {
      const r = { backend: b, mcp: saved.mcp };
      setDraft(r);
      run(SetSyncSettings(toGo(cfg, r))).then(load);
    } else {
      setDraft({ ...draft, backend: b });
    }
  };
  const saveRemote = () => {
    setBusy(true);
    setCheck(null);
    SetSyncSettings(toGo(cfg, draft))
      .then(() => CheckSyncMCP(mcpmap.Mapping.createFrom(draft.mcp)))
      .then((missing) => setCheck(missing?.length ? { ok: false, text: `Server không có tool: ${missing.join(', ')}` } : { ok: true, text: 'Đã lưu – server có đủ tool.' }))
      .catch((e) => setCheck({ ok: false, text: errorText(e) }))
      .finally(() => { setBusy(false); void refreshSyncStatus(); load(); });
  };
  const setPass = (pass: string, rotate: boolean) =>
    SetSyncPassphrase(pass, rotate)
      .then(() => { if (rotate) void SyncNow().catch(() => undefined); return ''; })
      .catch((e) => errorText(e))
      .finally(() => { void refreshSyncStatus(); });

  return (
    <SyncPanel status={status} cfg={cfg} busy={busy} error={error} onLogin={login} onLogout={() => run(SyncLogout())} onNow={() => run(SyncNow())} onCfg={patch}
      secrets={{ hasPassphrase: status.hasPassphrase, onSetPassphrase: setPass, onClearPassphrase: () => run(ClearSyncPassphrase()).then(load) }}
      remote={{ backend: draft.backend, mcp: draft.mcp, servers, presets, busy, check, onBackend: setBackend, onMcp: (p) => setDraft({ ...draft, mcp: { ...draft.mcp, ...p } }), onSave: saveRemote }} />
  );
}
