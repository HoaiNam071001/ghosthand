// Form thêm / sửa một MCP server ngoài (bước 55 M8) – chỉ hiển thị, state ở McpServersSettings.
import Segmented from '../Segmented';

export type ServerDraft = {
  id: string; name: string; kind: string; command: string; args: string; env: string; url: string; headers: string;
};

export const EMPTY_DRAFT: ServerDraft = { id: '', name: '', kind: 'stdio', command: '', args: '', env: '', url: '', headers: '' };

const KINDS = [{ id: 'stdio', label: 'Chạy lệnh (stdio)' }, { id: 'http', label: 'HTTP' }, { id: 'sse', label: 'SSE' }];
const input = 'rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus';

type Props = { draft: ServerDraft; onChange: (patch: Partial<ServerDraft>) => void; onSave: () => void; onCancel: () => void };

export default function McpServerForm({ draft: d, onChange, onSave, onCancel }: Props) {
  const stdio = d.kind === 'stdio';
  const ok = d.name.trim() !== '' && (stdio ? d.command.trim() !== '' : d.url.trim() !== '');
  return (
    <form className="flex flex-col gap-1.5 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); if (ok) onSave(); }}>
      <span className="font-semibold">{d.id ? 'Sửa server' : 'Thêm server'}</span>
      <input value={d.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Tên (vd Filesystem)" aria-label="Tên server" className={input} />
      <Segmented value={d.kind} options={KINDS} onChange={(kind) => onChange({ kind })} label="Kiểu kết nối" full />
      {stdio ? (
        <>
          <input value={d.command} onChange={(e) => onChange({ command: e.target.value })} placeholder="Lệnh (vd npx, uvx)" aria-label="Lệnh" className={`${input} font-mono`} spellCheck={false} />
          <input value={d.args} onChange={(e) => onChange({ args: e.target.value })} placeholder="Tham số (vd -y @modelcontextprotocol/server-filesystem /Users/ban/docs)" aria-label="Tham số" className={`${input} font-mono`} spellCheck={false} />
          <textarea value={d.env} onChange={(e) => onChange({ env: e.target.value })} rows={2} placeholder={'Biến môi trường, mỗi dòng TÊN={{secret.tên}}'} aria-label="Biến môi trường" className={`${input} font-mono`} spellCheck={false} />
        </>
      ) : (
        <>
          <input value={d.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://…/mcp" aria-label="Địa chỉ server" className={`${input} font-mono`} spellCheck={false} />
          <textarea value={d.headers} onChange={(e) => onChange({ headers: e.target.value })} rows={2} placeholder={'Header, mỗi dòng Tên: giá trị – vd Authorization: Bearer {{secret.github}}'} aria-label="Header" className={`${input} font-mono`} spellCheck={false} />
        </>
      )}
      <span className="text-xs text-muted">Token chỉ ghi dạng {'{{secret.<tên>}}'} (lưu ở tab Bí mật). Lần đầu dùng server, app hỏi bạn có tin lệnh / địa chỉ này không.</span>
      <div className="flex gap-1.5">
        <button type="submit" disabled={!ok} className="btn-primary rounded-control px-3 py-1.5 disabled:opacity-40">Lưu</button>
        <button type="button" onClick={onCancel} className="rounded-control px-3 py-1.5 text-muted hover:bg-hover hover:text-ink">Huỷ</button>
      </div>
    </form>
  );
}
