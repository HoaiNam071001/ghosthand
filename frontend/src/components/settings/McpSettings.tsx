// Cài đặt – AI qua MCP (bước 31): bật / tắt, mức chạy (31b – AiRunSettings), ưu tiên node (44 – NodePrefSettings), thêm vào Claude Desktop (hỏi trước khi ghi file của Claude), đoạn cấu
// hình mẫu cho từng client AI, các lệnh AI đã gọi gần đây.
import { useEffect, useState } from 'react';
import { AddToClaudeDesktop, ClaudeDesktopConfigPath, MCPClients, MCPLog, MCPSeenClients, MCPTools } from '../../../wailsjs/go/main/App';
import { mcpsrv, store } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import Select from '../Select';
import { selectBox } from '../stepform/shared';
import { Switch } from '../Switch';
import AiRunSettings from './AiRunSettings';
import NodePrefSettings from './NodePrefSettings';
import McpCallLog from './McpCallLog';
import McpTools from './McpTools';
import { CopyButton, SettingCode } from './parts';

export default function McpSettings({ mcp, onChange }: { mcp: store.MCPSettings; onChange: (patch: Partial<store.MCPSettings>) => void }) {
  const enabled = mcp.enabled;
  const [clients, setClients] = useState<mcpsrv.ClientConfig[]>([]);
  const [client, setClient] = useState('Claude Desktop');
  const [log, setLog] = useState<mcpsrv.Call[]>([]);
  const [confirm, setConfirm] = useState(''); // đường dẫn file Claude Desktop đang hỏi ghi
  const [msg, setMsg] = useState('');
  const [tools, setTools] = useState<mcpsrv.ToolInfo[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [toolClient, setToolClient] = useState(''); // '' = mặc định chung

  useEffect(() => {
    if (!enabled) return;
    MCPClients().then(setClients).catch((e) => setMsg(errorText(e)));
    MCPLog().then(setLog).catch(() => {});
    MCPTools().then(setTools).catch(() => {});
    MCPSeenClients().then(setSeen).catch(() => {});
  }, [enabled]);

  const add = () => {
    setConfirm('');
    AddToClaudeDesktop().then(() => setMsg('Đã thêm – thoát hẳn rồi mở lại Claude Desktop')).catch((e) => setMsg(errorText(e)));
  };
  const cfg = clients.find((c) => c.client === client) ?? clients[0];

  return (
    <>
      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col">Cho AI điều khiển (MCP)
          <span className="text-xs text-muted">Claude, Cursor, Codex… tạo / sửa / chạy thử kịch bản</span>
        </span>
        <Switch on={enabled} onChange={(on) => onChange({ enabled: on })} label="Bật MCP" />
      </label>
      {enabled && (
        <>
          <AiRunSettings mcp={mcp} onChange={onChange} />
          <NodePrefSettings mcp={mcp} onChange={onChange} />
          <McpTools mcp={mcp} tools={tools} seen={seen} client={toolClient} onClient={setToolClient} onChange={onChange} />
          {confirm ? (
            <div className="flex flex-col gap-1.5 rounded-control bg-soft p-2 text-xs">
              Ghi mục “ghosthand” vào <span className="font-mono break-all">{confirm}</span>? Cài đặt khác của Claude giữ nguyên.
              <span className="flex gap-1.5">
                <button onClick={add} className="btn-primary rounded-control px-3 py-1 text-on-accent">Ghi</button>
                <button onClick={() => setConfirm('')} className="rounded-control border border-line px-3 py-1 hover:bg-hover">Huỷ</button>
              </span>
            </div>
          ) : (
            <button onClick={() => ClaudeDesktopConfigPath().then(setConfirm).catch((e) => setMsg(errorText(e)))}
              className="self-start rounded-control border border-line px-3 py-1.5 hover:bg-hover">Thêm vào Claude Desktop…</button>
          )}
          {cfg && (
            <div className="flex flex-col gap-1 text-muted">
              <span className="flex items-center gap-1.5">
                <Select value={cfg.client} onChange={setClient} options={clients.map((c) => ({ value: c.client, label: c.client }))}
                  className={`${selectBox} flex-1`} aria-label="Client AI" />
                <CopyButton text={cfg.text} label="Chép cấu hình" />
              </span>
              <span className="text-xs">{cfg.where}</span>
              <SettingCode>{cfg.text}</SettingCode>
            </div>
          )}
          <McpCallLog calls={log} />
        </>
      )}
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </>
  );
}
