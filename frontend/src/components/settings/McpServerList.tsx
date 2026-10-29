// Danh sách MCP server đã thêm (bước 55 M8) – chỉ hiển thị, hành động qua props (màn mẫu #demo-mcp dùng chung).
import { main } from '../../../wailsjs/go/models';
import { statusText } from '../../flow/mcpServer';
import { SettingCode } from './parts';

type Props = {
  list: main.MCPServerView[]; busy: string;
  onReload: (s: main.MCPServerView) => void; onEdit: (s: main.MCPServerView) => void;
  onToggle: (s: main.MCPServerView) => void; onRemove: (s: main.MCPServerView) => void;
};

export default function McpServerList({ list, busy, onReload, onEdit, onToggle, onRemove }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {list.map((s) => (
        <li key={s.id} className="flex flex-col gap-1 rounded-control border border-line p-2">
          <div className="flex items-center gap-1.5">
            <span className={`flex-1 truncate font-medium ${s.enabled ? '' : 'text-muted line-through'}`}>{s.name}</span>
            <SettingCode>{s.id}</SettingCode>
          </div>
          <span className={`text-xs ${s.status?.state === 'error' ? 'text-danger-text' : 'text-muted'}`}>{s.enabled ? statusText(s.status) : 'Đang tắt'}</span>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button onClick={() => onReload(s)} disabled={!s.enabled || busy === s.id} className="rounded-control px-2 py-1 hover:bg-hover disabled:opacity-40">{busy === s.id ? 'Đang tải…' : 'Tải lại'}</button>
            <button onClick={() => onEdit(s)} className="rounded-control px-2 py-1 hover:bg-hover">Sửa</button>
            <button onClick={() => onToggle(s)} className="rounded-control px-2 py-1 hover:bg-hover">{s.enabled ? 'Tắt' : 'Bật'}</button>
            <button onClick={() => onRemove(s)} aria-label={`Xoá server ${s.name}`} className="btn-danger-soft rounded-control px-2 py-1">Xoá</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
