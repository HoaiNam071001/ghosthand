import { describe, expect, it } from 'vitest';
import { fmtMCPTool, mcpArgsError } from './mcpTool';

describe('mcpArgsError', () => {
  it('trống, object, có biến → hợp lệ', () => {
    expect(mcpArgsError('')).toBe('');
    expect(mcpArgsError(undefined)).toBe('');
    expect(mcpArgsError('{"path":"/tmp"}')).toBe('');
    expect(mcpArgsError('{"n":{{n1.output.value}}}')).toBe('');
  });
  it('mảng / hỏng → báo lỗi', () => {
    expect(mcpArgsError('[1]')).not.toBe('');
    expect(mcpArgsError('{path')).not.toBe('');
  });
});

describe('fmtMCPTool', () => {
  it('nhắc phần còn thiếu', () => {
    expect(fmtMCPTool({})).toContain('chưa chọn server');
    expect(fmtMCPTool({ mcpServer: 'fs' })).toContain('chưa chọn tool');
    expect(fmtMCPTool({ mcpServer: 'fs', mcpTool: 'read' })).toBe('fs · read');
  });
});
