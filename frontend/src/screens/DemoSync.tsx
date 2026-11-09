// Màn #demo-sync (bước 54 C8): Cài đặt → Đồng bộ + chấm trạng thái + hộp xung đột, dữ liệu giả, không cần Go.
// ?backend=mcp mở sẵn khối MCP server. ?state=out|noclient|ok|busy|error|conflict|warn|secrets  ?ask=1 mở hộp xung đột  ?theme=dark
import { useState } from 'react';
import SyncChip from '../components/sync/SyncChip';
import SyncConflictDialog from '../components/sync/SyncConflictDialog';
import SyncPanel, { SyncCfg } from '../components/sync/SyncPanel';
import { DEMO_CFG, DEMO_CONFLICT, DEMO_PRESETS, DEMO_SERVERS, demoStatus } from '../demo/syncDemo';
import { EMPTY_MCP_MAP, McpMap, SyncBackend } from '../sync/types';
import type { SyncConflict } from '../sync/types';

export default function DemoSync() {
  const q = new URLSearchParams(location.search);
  const status = { ...demoStatus(q.get('state') ?? 'ok'), backend: q.get('backend') ?? '' };
  const [backend, setBackend] = useState<SyncBackend>(q.get('backend') === 'mcp' ? 'mcp' : 'gdrive');
  const [mcp, setMcp] = useState<McpMap>({ ...EMPTY_MCP_MAP, server: 'fs' });
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [cfg, setCfg] = useState<SyncCfg>(DEMO_CFG);
  const [ask, setAsk] = useState<SyncConflict | null>(q.get('ask') ? DEMO_CONFLICT : null);
  const [hasPass, setHasPass] = useState(status.hasPassphrase);
  const [last, setLast] = useState('');
  return (
    <div className="flex min-h-screen flex-col bg-bg text-[13px] text-ink">
      <div className="mx-auto flex w-[760px] max-w-full flex-1 flex-col gap-3 p-6">
        <div className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-[18px]">
          <SyncPanel status={{ ...status, hasPassphrase: hasPass }} cfg={cfg} busy={false} error="" onLogin={() => setLast('Đăng nhập')} onLogout={() => setLast('Đăng xuất')}
            onNow={() => setLast('Đồng bộ ngay')} onCfg={(p) => setCfg({ ...cfg, ...p })}
            remote={{ backend, mcp, servers: DEMO_SERVERS, presets: DEMO_PRESETS, busy: false, check, onBackend: (b) => { setBackend(b); setCheck(null); },
              onMcp: (p) => setMcp({ ...mcp, ...p }), onSave: () => setCheck(mcp.readTool ? { ok: true, text: 'Đã lưu – server có đủ tool.' } : { ok: false, text: 'cần khai tên tool đọc và tool ghi file' }) }}
            secrets={{ hasPassphrase: hasPass, onSetPassphrase: async () => { setHasPass(true); return ''; }, onClearPassphrase: () => { setHasPass(false); setCfg({ ...cfg, secrets: false }); } }} />
        </div>
        <button onClick={() => setAsk(DEMO_CONFLICT)} className="self-start rounded-control border border-line bg-surface px-3 py-1.5 hover:bg-hover">Mở hộp xung đột</button>
        {last && <span className="text-muted">Bạn vừa bấm: {last}</span>}
      </div>
      <footer className="flex items-center gap-4 border-t border-line bg-chrome px-4 py-[5px] text-xs text-muted">
        <span>Sẵn sàng</span><SyncChip status={status} onClick={() => setLast('Chấm trạng thái')} />
      </footer>
      <SyncConflictDialog ask={ask} onAnswer={(a) => { setLast(`Hộp xung đột: ${a}`); setAsk(null); }} />
    </div>
  );
}
