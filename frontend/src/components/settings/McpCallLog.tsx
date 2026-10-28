// Cài đặt → MCP: bảng lệnh AI gần đây (bước 53 B2) – giờ, kết quả, tool, client, thời lượng; bấm một dòng xem tham số đã che.
// Chỉ hiển thị: dữ liệu từ MCPLog (Go đã che bí mật trước khi ghi nhật ký).
import { useState } from 'react';
import { mcpsrv } from '../../../wailsjs/go/models';

const timeText = (at: string) => new Date(at).toLocaleTimeString('vi-VN', { hour12: false });
const durText = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

export default function McpCallLog({ calls }: { calls: mcpsrv.Call[] }) {
  const [open, setOpen] = useState(-1);
  if (calls.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted">Lệnh AI gần đây
      <div className="flex max-h-56 flex-col overflow-y-auto">
        {calls.map((c, i) => {
          const args = Object.entries(c.args ?? {});
          return (
            <div key={i} className="flex flex-col">
              <button type="button" title={c.error} onClick={() => setOpen(open === i ? -1 : i)}
                className="flex items-center gap-2 rounded px-1 py-0.5 text-left font-mono hover:bg-hover">
                <span>{timeText(c.at)}</span>
                <span className={c.ok ? 'text-ok' : 'text-danger-text'}>{c.ok ? '✓' : '✗'}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{c.tool}</span>
                {c.client && <span className="max-w-24 truncate">{c.client}</span>}
                <span className="w-14 text-right">{durText(c.ms)}</span>
              </button>
              {open === i && (
                <div className="mb-1 ml-5 flex flex-col gap-0.5 rounded bg-soft px-2 py-1 font-mono">
                  {args.length === 0 && <span>Không có tham số</span>}
                  {args.map(([k, v]) => (
                    <span key={k} className="break-all"><span className="text-ink">{k}</span>: {v}</span>
                  ))}
                  {c.error && <span className="break-all text-danger-text">{c.error}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
