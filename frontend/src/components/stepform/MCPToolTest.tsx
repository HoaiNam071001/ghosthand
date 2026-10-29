// "Chạy thử" tool MCP một lần (qua cổng quyền như chạy thật) + xem output mẫu (bước 55 M4).
import { useState } from 'react';
import { TestMCPTool } from '../../../wailsjs/go/main/App';
import { errorText } from '../../engineStore';
import { errText, hint } from './shared';

type Props = { server: string; tool: string; args: string };

export default function MCPToolTest({ server, tool, args }: Props) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  const run = () => {
    setBusy(true); setErr(''); setOut(null);
    TestMCPTool(server, tool, args).then(setOut).catch((e) => setErr(errorText(e))).finally(() => setBusy(false));
  };
  const text = out && (typeof out.text === 'string' ? out.text : '');
  return (
    <div className="col-span-2 flex flex-col gap-1.5">
      <button onClick={run} disabled={busy || !server || !tool} className="btn-primary self-start rounded-control px-3 py-1.5 text-xs disabled:opacity-40">
        {busy ? 'Đang gọi…' : 'Chạy thử'}
      </button>
      <span className={hint}>Gọi tool thật một lần. Biến {'{{…}}'} trong đối số không thay được ở đây.</span>
      {err && <span className={errText}>{err}</span>}
      {out && (
        <div className="flex flex-col gap-1 rounded-control border border-line bg-field p-2 text-xs">
          <span className={out.isError ? 'text-danger-text' : 'text-muted'}>{out.isError ? 'Tool báo lỗi:' : 'Kết quả (text):'}</span>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">{text || '(không có chữ)'}</pre>
          {out.json !== undefined && <span className="text-muted">Có output.json – đọc sâu {'{{n2.output.json.<trường>}}'}</span>}
        </div>
      )}
    </div>
  );
}
