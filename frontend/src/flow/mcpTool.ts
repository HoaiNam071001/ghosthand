// Node Gọi tool MCP (bước 55 M3) – dòng chi tiết thẻ + kiểm tra đối số. Chạy ở internal/engine/mcptool.go.
import { tr } from '../i18n/lang';
import type { Step } from '../types';

// Đối số: trống hoặc JSON object. Có {{biến}} thì chỉ biết dạng lúc chạy (khớp script/mcpcheck.go).
export function mcpArgsError(args?: string): string {
  const a = args?.trim();
  if (!a || a.includes('{{')) return '';
  try {
    const v = JSON.parse(a);
    return v && typeof v === 'object' && !Array.isArray(v) ? '' : tr('fx.mcp.obj');
  } catch {
    return tr('fx.mcp.bad');
  }
}

// "fs · read_text_file" hoặc nhắc còn thiếu gì.
export function fmtMCPTool(s: Partial<Pick<Step, 'mcpServer' | 'mcpTool'>>): string {
  const server = s.mcpServer?.trim();
  const tool = s.mcpTool?.trim();
  if (!server) return tr('fx.mcp.noServer');
  if (!tool) return `${server} · ${tr('fx.mcp.noTool')}`;
  return `${server} · ${tool}`;
}
