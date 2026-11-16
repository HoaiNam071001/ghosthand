// Cài đặt → MCP: bảng tool AI được gọi, bật / tắt từng tool, mặc định chung hoặc riêng từng loại AI (bước 31b2).
// Chỉ hiển thị; McpSettings lưu.
import { store, mcpsrv } from '../../../wailsjs/go/models';
import { MsgKey, useT } from '../../i18n';
import Select from '../Select';
import { selectBox } from '../stepform/shared';
import { Switch } from '../Switch';
import { clearOverride, clientChoices, hasOverride, offFor, setToolOn } from './toolAccess';

const KIND: Record<string, MsgKey> = {
  read: 'mcps.t.read', write: 'mcps.t.write', run: 'mcps.t.run', screen: 'mcps.t.screen', app: 'mcps.t.app',
};
const DEFAULT = '';

type Props = {
  mcp: store.MCPSettings;
  tools: mcpsrv.ToolInfo[];
  seen: string[];
  client: string;
  onClient: (c: string) => void;
  onChange: (patch: Partial<store.MCPSettings>) => void;
};

export default function McpTools({ mcp, tools, seen, client, onClient, onChange }: Props) {
  const t = useT();
  const off = offFor(mcp, client);
  const options = [{ value: DEFAULT, label: t('mcps.t.default') }, ...clientChoices(mcp, seen).map((c) => ({ value: c, label: c }))];
  return (
    <div className="flex flex-col gap-1.5">
      <span>{t('mcps.t.title')}</span>
      <span className="flex items-center gap-1.5">
        <Select value={client} onChange={onClient} options={options} className={`${selectBox} flex-1`} aria-label={t('mcps.t.clientAria')} />
        {hasOverride(mcp, client) && (
          <button onClick={() => { onChange(clearOverride(mcp, client)); onClient(DEFAULT); }}
            className="rounded-control border border-line px-2 py-1 text-xs hover:bg-hover">{t('mcps.t.useDefault')}</button>
        )}
      </span>
      <span className="text-xs text-muted">
        {client ? (hasOverride(mcp, client) ? t('mcps.t.own') : t('mcps.t.following')) : t('mcps.t.defHint')}
      </span>
      {tools.map((tool) => (
        <label key={tool.name} title={tool.desc} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-mono text-xs">{tool.name}</span>
            <span className="text-xs text-muted">{KIND[tool.kind] ? t(KIND[tool.kind]) : tool.kind}</span>
          </span>
          <Switch on={!off.includes(tool.name)} onChange={(on) => onChange(setToolOn(mcp, client, tool.name, on))} label={t('mcps.t.toolAria', { name: tool.name })} />
        </label>
      ))}
    </div>
  );
}
