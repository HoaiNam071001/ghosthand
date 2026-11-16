// Khối "Nơi đồng bộ" trong Cài đặt → Đồng bộ (bước 54 C9): Google Drive hoặc MCP server do người dùng khai.
// Chỉ hiển thị – lưu / kiểm tra qua props. MCP: ánh xạ 4 thao tác sang tên tool của server; nội dung gửi dạng base64.
import { tr, useLang } from '../../i18n';
import { EMPTY_MCP_MAP, McpMap, McpPreset, McpServerOpt, SyncBackend } from '../../sync/types';
import Segmented from '../Segmented';
import Select from '../Select';

export type RemoteBoxProps = {
  backend: SyncBackend; // lựa chọn đang soạn (chưa chắc đã lưu)
  mcp: McpMap;
  servers: McpServerOpt[];
  presets: McpPreset[];
  busy: boolean;
  /** Kết quả "Lưu & kiểm tra" gần nhất. */
  check: { ok: boolean; text: string } | null;
  onBackend: (b: SyncBackend) => void;
  onMcp: (patch: Partial<McpMap>) => void;
  onSave: () => void;
};

const input = 'w-full rounded-control border border-line bg-field px-2 py-1.5 font-mono text-ink outline-none focus:ring-focus';

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span>{label}{hint && <span className="ml-1 text-xs text-muted">{hint}</span>}</span>
      {children}
    </label>
  );
}

export default function SyncRemoteBox({ backend, mcp, servers, presets, busy, check, onBackend, onMcp, onSave }: RemoteBoxProps) {
  useLang();
  const text = (k: keyof McpMap, ph = '') => <input value={mcp[k]} onChange={(e) => onMcp({ [k]: e.target.value })} placeholder={ph} className={input} aria-label={k} />;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted">{tr('sync.remote.where')}</span>
      <Segmented<SyncBackend> value={backend} label={tr('sync.remote.where')} onChange={onBackend} options={[{ id: 'gdrive', label: 'Google Drive' }, { id: 'mcp', label: 'MCP server' }]} />
      {backend === 'mcp' && (
        <div className="flex flex-col gap-2 rounded-control border border-line bg-soft p-3">
          <span className="text-xs text-muted">
            {tr('sync.remote.descA')}<b>{tr('sync.remote.descB')}</b>{tr('sync.remote.descC')}
          </span>
          <F label={tr('sync.remote.mcpServer')}>
            <Select value={mcp.server} placeholder={tr('sync.remote.pickServer')} aria-label={tr('sync.remote.mcpServer')} className="w-full rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus"
              onChange={(v) => onMcp({ server: v })} options={servers.map((s) => ({ value: s.id, label: s.enabled ? s.name : tr('sync.remote.off', { name: s.name }) }))} />
          </F>
          {!!presets.length && (
            <F label={tr('sync.remote.preset')} hint={tr('sync.remote.presetHint')}>
              <Select value="" placeholder={tr('sync.remote.pickPreset')} aria-label={tr('sync.remote.presetAria')} className="w-full rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus"
                onChange={(id) => { const p = presets.find((x) => x.id === id); if (p) onMcp({ ...EMPTY_MCP_MAP, ...p.mapping, server: mcp.server, root: mcp.root }); }}
                options={presets.map((p) => ({ value: p.id, label: p.name }))} />
              {presets.map((p) => <span key={p.id} className="text-xs text-muted">{p.desc}</span>)}
            </F>
          )}
          <F label={tr('sync.remote.root')} hint={tr('sync.remote.rootHint')}>{text('root', tr('sync.remote.rootPh'))}</F>
          <div className="grid grid-cols-2 gap-2">
            <F label={tr('sync.remote.read')}>{text('readTool', 'read_text_file')}</F>
            <F label={tr('sync.remote.write')}>{text('writeTool', 'write_file')}</F>
            <F label={tr('sync.remote.del')} hint={tr('sync.remote.optional')}>{text('deleteTool')}</F>
            <F label={tr('sync.remote.mkdir')} hint={tr('sync.remote.optional')}>{text('mkdirTool', 'create_directory')}</F>
            <F label={tr('sync.remote.pathArg')}>{text('pathArg', 'path')}</F>
            <F label={tr('sync.remote.contentArg')}>{text('contentArg', 'content')}</F>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSave} disabled={busy} className="btn-primary rounded-control px-3 py-1.5 disabled:opacity-50">{busy ? tr('sync.remote.checking') : tr('sync.pendingB')}</button>
            {check && <span className={`text-xs ${check.ok ? 'text-ok' : 'text-danger-text'}`}>{check.text}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
