// Danh sách MCP server đã thêm (bước 55 M8) – chỉ hiển thị, hành động qua props (màn mẫu #demo-mcp dùng chung).
import { app } from '../../../wailsjs/go/models';
import { statusText } from '../../flow/mcpServer';
import { useT } from '../../i18n';
import { SettingCode } from './parts';

type Props = {
  list: app.MCPServerView[]; busy: string;
  onReload: (s: app.MCPServerView) => void; onEdit: (s: app.MCPServerView) => void;
  onToggle: (s: app.MCPServerView) => void; onRemove: (s: app.MCPServerView) => void;
};

export default function McpServerList({ list, busy, onReload, onEdit, onToggle, onRemove }: Props) {
  const t = useT();
  return (
    <ul className="flex flex-col gap-2">
      {list.map((s) => (
        <li key={s.id} className="flex flex-col gap-1 rounded-control border border-line p-2">
          <div className="flex items-center gap-1.5">
            <span className={`flex-1 truncate font-medium ${s.enabled ? '' : 'text-muted line-through'}`}>{s.name}</span>
            <SettingCode>{s.id}</SettingCode>
          </div>
          <span className={`text-xs ${s.status?.state === 'error' ? 'text-danger-text' : 'text-muted'}`}>{s.enabled ? statusText(s.status) : t('mcps.off')}</span>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button onClick={() => onReload(s)} disabled={!s.enabled || busy === s.id} className="rounded-control px-2 py-1 hover:bg-hover disabled:opacity-40">{busy === s.id ? t('mcps.loading') : t('mcps.reload')}</button>
            <button onClick={() => onEdit(s)} className="rounded-control px-2 py-1 hover:bg-hover">{t('mcps.edit')}</button>
            <button onClick={() => onToggle(s)} className="rounded-control px-2 py-1 hover:bg-hover">{s.enabled ? t('mcps.disable') : t('mcps.on')}</button>
            <button onClick={() => onRemove(s)} aria-label={t('mcps.delAria', { name: s.name })} className="btn-danger-soft rounded-control px-2 py-1">{t('mcps.del')}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
