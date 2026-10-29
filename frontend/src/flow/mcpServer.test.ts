import { describe, expect, it } from 'vitest';
import { formatPairs, joinArgs, libraryFields, parsePairs, splitArgs, statusText } from './mcpServer';

describe('args', () => {
  it('tách theo khoảng trắng, nháy kép gom lại', () => {
    expect(splitArgs('-y @a/b  "/My Docs"')).toEqual(['-y', '@a/b', '/My Docs']);
    expect(splitArgs('')).toEqual([]);
  });
  it('ghép lại khớp tách', () => {
    const a = ['-y', '@a/b', '/My Docs'];
    expect(splitArgs(joinArgs(a))).toEqual(a);
  });
});

describe('pairs', () => {
  it('env và header', () => {
    expect(parsePairs('TOKEN={{secret.gh}}\n\nA=b=c', '=')).toEqual({ TOKEN: '{{secret.gh}}', A: 'b=c' });
    expect(parsePairs('Authorization: Bearer {{secret.gh}}', ':')).toEqual({ Authorization: 'Bearer {{secret.gh}}' });
    expect(formatPairs({ A: '1' }, '=')).toBe('A=1');
    expect(formatPairs({ Authorization: 'x' }, ':')).toBe('Authorization: x');
  });
});

describe('statusText', () => {
  it('các trạng thái', () => {
    expect(statusText(undefined)).toBe('Chưa kết nối');
    expect(statusText({ state: 'ok', tools: [1, 2] })).toBe('Đã kết nối · 2 tool');
    expect(statusText({ state: 'error', err: 'x' })).toBe('Lỗi: x');
  });
});

describe('libraryFields', () => {
  it('điền tham số vào args, giữ header secret', () => {
    const f = libraryFields({ name: 'FS', kind: 'stdio', command: 'npx', args: ['-y', 'pkg', '${dir}'] }, { dir: '/My Docs' });
    expect(f.args).toBe('-y pkg "/My Docs"');
    expect(libraryFields({ name: 'GH', kind: 'http', url: 'https://x/mcp/', headers: { Authorization: 'Bearer {{secret.t}}' } }, {}).headers)
      .toBe('Authorization: Bearer {{secret.t}}');
  });
});
