// Hỏi quyền dùng MCP server ngoài (bước 55 M2). kind=server: lần đầu / khi lệnh hoặc địa chỉ đổi – hiện đủ lệnh vì nối là
// chạy lệnh trên máy. kind=tool: tool có thể ghi / xoá / đụng dịch vụ ngoài. Mô tả tool là chữ của server ngoài → chỉ hiển thị.
// Enter = cho phép một lần, Esc = từ chối.
import { useEffect } from 'react';
import { answerMCP, useMCPAsk } from '../mcpAsk';
import { Play } from './icons';

export default function MCPAskDialog() {
  const ask = useMCPAsk();
  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answerMCP('deny');
      else if (e.key === 'Enter') answerMCP('once');
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ask]);
  if (!ask) return null;
  const isServer = ask.kind === 'server';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[14vh]">
      <div role="alertdialog" aria-labelledby="mcp-ask-title"
        className="flex w-[480px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div className="flex gap-3 p-[18px]">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[9px] bg-accent-soft text-accent-text"><Play className="h-[18px] w-[18px]" /></span>
          <div className="flex min-w-0 flex-col gap-2">
            <div id="mcp-ask-title" className="text-base font-semibold">
              {isServer ? `Cho phép chạy server MCP “${ask.server}”?` : `Cho phép gọi “${ask.tool}” của “${ask.server}”?`}
            </div>
            <span className="text-[13px]">
              {isServer ? 'Kết nối sẽ chạy lệnh / mở địa chỉ dưới đây trên máy bạn. Chỉ cho phép nếu bạn tin nguồn của nó.'
                : `Tool này ${ask.risk ?? 'có thể ghi dữ liệu'}${ask.open ? ' và đụng tới dịch vụ bên ngoài' : ''}.`}
            </span>
            <code className="break-all rounded-control bg-field px-2 py-1.5 font-mono text-xs">{ask.command}</code>
            {isServer && !!ask.env?.length && <span className="text-xs text-muted">Gửi kèm: <span className="font-mono">{ask.env.join(', ')}</span> (giá trị lấy từ Bí mật)</span>}
            {!isServer && ask.desc && <span className="line-clamp-3 text-xs text-muted" title={ask.desc}>Mô tả của server: {ask.desc}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-chrome px-[18px] py-3">
          <button onClick={() => answerMCP('deny')} className="h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">Từ chối <span className="font-mono text-[11px] text-muted">Esc</span></button>
          <button onClick={() => answerMCP('always')} className="ml-auto h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">{isServer ? 'Luôn tin cấu hình này' : 'Luôn cho tool này'}</button>
          <button autoFocus onClick={() => answerMCP('once')} className="btn-primary h-9 rounded-control px-4 font-semibold text-on-accent">Cho phép lần này</button>
        </div>
      </div>
    </div>
  );
}
