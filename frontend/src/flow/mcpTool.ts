// Node Gọi tool MCP (bước 55 M3) – dòng chi tiết thẻ + kiểm tra đối số. Chạy ở internal/engine/mcptool.go.
import type { Step } from '../types';

// Đối số: trống hoặc JSON object. Có {{biến}} thì chỉ biết dạng lúc chạy (khớp script/mcpcheck.go).
export function mcpArgsError(args?: string): string {
  const a = args?.trim();
  if (!a || a.includes('{{')) return '';
  try {
    const v = JSON.parse(a);
    return v && typeof v === 'object' && !Array.isArray(v) ? '' : 'Đối số phải là JSON object, vd {"path":"/tmp"}';
  } catch {
    return 'Đối số không phải JSON hợp lệ';
  }
}

// "fs · read_text_file" hoặc nhắc còn thiếu gì.
export function fmtMCPTool(s: Partial<Pick<Step, 'mcpServer' | 'mcpTool'>>): string {
  const server = s.mcpServer?.trim();
  const tool = s.mcpTool?.trim();
  if (!server) return '(chưa chọn server MCP)';
  if (!tool) return `${server} · (chưa chọn tool)`;
  return `${server} · ${tool}`;
}
