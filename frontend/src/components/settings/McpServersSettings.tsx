// Cài đặt – MCP server (bước 55 M8): server ngoài mà node Gọi tool MCP dùng. Thêm / sửa / bật tắt / xoá / tải lại danh sách tool.
// Cấu hình + kiểm tra ở Go (store.MCPServer); chỉ giao diện sửa – AI qua MCP không động tới tab này.
import { useEffect, useState } from 'react';
import { DeleteMCPServer, ListMCPServers, MCPLibrary, RefreshMCPServer, SaveMCPServer, SetMCPServerEnabled } from '../../../wailsjs/go/main/App';
import { main, mcplib, store } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import { formatPairs, joinArgs, parsePairs, splitArgs } from '../../flow/mcpServer';
import McpServerList from './McpServerList';
import { openSettings } from '../../settingsNav';
import McpLibrary from './McpLibrary';
import McpServerForm, { EMPTY_DRAFT, ServerDraft } from './McpServerForm';

const toDraft = (s: main.MCPServerView): ServerDraft => ({
  id: s.id, name: s.name, kind: s.kind, command: s.command ?? '', args: joinArgs(s.args), env: formatPairs(s.env, '='), url: s.url ?? '', headers: formatPairs(s.headers, ':'),
});

const toServer = (d: ServerDraft, enabled: boolean) => store.MCPServer.createFrom({
  id: d.id, name: d.name.trim(), kind: d.kind, enabled,
  ...(d.kind === 'stdio'
    ? { command: d.command.trim(), args: splitArgs(d.args), env: parsePairs(d.env, '=') }
    : { url: d.url.trim(), headers: parsePairs(d.headers, ':') }),
});

export default function McpServersSettings({ onError }: { onError: (msg: string) => void }) {
  const [list, setList] = useState<main.MCPServerView[]>([]);
  const [draft, setDraft] = useState<ServerDraft | null>(null);
  const [busy, setBusy] = useState('');
  const [lib, setLib] = useState<mcplib.Entry[] | null>(null); // null = thư viện đang đóng
  const fail = (e: unknown) => onError(errorText(e));
  const refresh = () => ListMCPServers().then((l) => setList(l ?? [])).catch(fail);
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!draft) return;
    const enabled = list.find((s) => s.id === draft.id)?.enabled ?? true;
    SaveMCPServer(toServer(draft, enabled)).then(() => { setDraft(null); onError(''); return refresh(); }).catch(fail);
  };
  const toggle = (s: main.MCPServerView) => SetMCPServerEnabled(s.id, !s.enabled).then(() => refresh()).catch(fail);
  const remove = (s: main.MCPServerView) => DeleteMCPServer(s.id).then(() => { onError(''); return refresh(); }).catch(fail);
  const reload = (s: main.MCPServerView) => {
    setBusy(s.id);
    RefreshMCPServer(s.id).then(() => onError('')).catch(fail).finally(() => { setBusy(''); refresh(); });
  };

  return (
    <>
      <span className="font-semibold">MCP server</span>
      <span className="text-xs text-muted">
        Server MCP ngoài (đọc file, GitHub, Sheets…) để node <b>Gọi tool MCP</b> dùng. Kết nối kiểu “Chạy lệnh” sẽ chạy lệnh đó trên máy bạn – chỉ thêm server bạn tin.
      </span>
      {list.length === 0 && !draft && <span className="text-muted">Chưa có server nào.</span>}
      <McpServerList list={list} busy={busy} onReload={reload} onEdit={(s) => setDraft(toDraft(s))} onToggle={toggle} onRemove={remove} />
      {draft
        ? <McpServerForm draft={draft} onChange={(p) => setDraft({ ...draft, ...p })} onSave={save} onCancel={() => setDraft(null)} />
        : (
          <div className="flex gap-1.5">
            <button onClick={() => setDraft(EMPTY_DRAFT)} className="btn-primary rounded-control px-3 py-1.5">Thêm server</button>
            <button onClick={() => (lib ? setLib(null) : MCPLibrary().then(setLib).catch(fail))} className="rounded-control border border-line px-3 py-1.5 hover:bg-hover">{lib ? 'Đóng thư viện' : 'Thư viện'}</button>
          </div>
        )}
      {lib && !draft && <McpLibrary entries={lib} onPick={(d) => { setDraft(d); setLib(null); }} onOpenSecrets={() => openSettings('secrets')} />}
    </>
  );
}
