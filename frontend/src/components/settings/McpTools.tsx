// Cài đặt → MCP: bảng tool AI được gọi, bật / tắt từng tool, mặc định chung hoặc riêng từng loại AI (bước 31b2).
// Chỉ hiển thị; McpSettings lưu.
import { store, mcpsrv } from '../../../wailsjs/go/models';
import Select from '../Select';
import { selectBox } from '../stepform/shared';
import { Switch } from '../Switch';
import { clearOverride, clientChoices, hasOverride, offFor, setToolOn } from './toolAccess';

const KIND: Record<string, string> = {
  read: 'chỉ đọc', write: 'sửa kịch bản', run: 'chạy trên máy', screen: 'nhìn màn hình', app: 'mở trong app',
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
  const off = offFor(mcp, client);
  const options = [{ value: DEFAULT, label: 'Mặc định (mọi AI)' }, ...clientChoices(mcp, seen).map((c) => ({ value: c, label: c }))];
  return (
    <div className="flex flex-col gap-1.5">
      <span>Tool AI được dùng</span>
      <span className="flex items-center gap-1.5">
        <Select value={client} onChange={onClient} options={options} className={`${selectBox} flex-1`} aria-label="Loại AI" />
        {hasOverride(mcp, client) && (
          <button onClick={() => { onChange(clearOverride(mcp, client)); onClient(DEFAULT); }}
            className="rounded-control border border-line px-2 py-1 text-xs hover:bg-hover">Dùng mặc định</button>
        )}
      </span>
      <span className="text-xs text-muted">
        {client ? (hasOverride(mcp, client) ? 'Danh sách riêng cho AI này.' : 'Đang theo mặc định – sửa một tool sẽ tạo danh sách riêng.') : 'Áp dụng cho AI chưa có danh sách riêng. AI hiện tên sau lần kết nối đầu.'}
      </span>
      {tools.map((t) => (
        <label key={t.name} title={t.desc} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-mono text-xs">{t.name}</span>
            <span className="text-xs text-muted">{KIND[t.kind] ?? t.kind}</span>
          </span>
          <Switch on={!off.includes(t.name)} onChange={(on) => onChange(setToolOn(mcp, client, t.name, on))} label={`Tool ${t.name}`} />
        </label>
      ))}
    </div>
  );
}
