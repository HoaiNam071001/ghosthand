import { describe, expect, it } from 'vitest';
import { listToText, missingRequired, numberError, parseArgs, parseNumberInput, schemaFields, setArg, textToList } from './mcpSchema';

const schema = {
  type: 'object',
  properties: {
    mode: { type: 'string', enum: ['a', 'b'] },
    path: { type: 'string', description: 'đường dẫn' },
    n: { type: ['integer', 'null'] },
    deep: { type: 'boolean' },
    tags: { type: 'array', items: { type: 'string' } },
    opts: { type: 'object' },
    nums: { type: 'array', items: { type: 'number' } },
  },
  required: ['path'],
};

describe('schemaFields', () => {
  it('kiểu từng trường, bắt buộc lên trước', () => {
    const f = schemaFields(schema);
    expect(f.map((x) => x.name)).toEqual(['path', 'mode', 'n', 'deep', 'tags', 'opts', 'nums']);
    expect(f.map((x) => x.kind)).toEqual(['string', 'enum', 'integer', 'boolean', 'stringList', 'json', 'json']);
    expect(f[0]).toMatchObject({ required: true, desc: 'đường dẫn' });
  });
  it('schema lạ → rỗng', () => {
    expect(schemaFields(null)).toEqual([]);
    expect(schemaFields({ type: 'object' })).toEqual([]);
    expect(schemaFields('x')).toEqual([]);
  });
});

describe('args', () => {
  it('parseArgs', () => {
    expect(parseArgs('')).toEqual({});
    expect(parseArgs('{"a":1}')).toEqual({ a: 1 });
    expect(parseArgs('[1]')).toBeNull();
    expect(parseArgs('{"n":{{x}}}')).toBeNull();
  });
  it('setArg thêm / đổi / xoá', () => {
    let t = setArg('', 'path', '/a');
    expect(t).toBe('{"path":"/a"}');
    t = setArg(t, 'n', 3);
    expect(parseArgs(t)).toEqual({ path: '/a', n: 3 });
    t = setArg(t, 'path', '');
    t = setArg(t, 'n', undefined);
    expect(t).toBe('');
    expect(setArg('{"a":1}', 'a', false)).toBe('{"a":false}');
    expect(setArg('{"t":["x"]}', 't', [])).toBe('');
  });
  it('số', () => {
    expect(parseNumberInput('', false)).toBeUndefined();
    expect(parseNumberInput('3.5', false)).toBe(3.5);
    expect(parseNumberInput('3.5', true)).toBe('3.5');
    expect(numberError('abc')).not.toBe('');
    expect(numberError(3)).toBe('');
  });
  it('danh sách chữ', () => {
    expect(textToList(' a \n\nb')).toEqual(['a', 'b']);
    expect(listToText(['a', 'b'])).toBe('a\nb');
  });
  it('thiếu trường bắt buộc', () => {
    const f = schemaFields(schema);
    expect(missingRequired(f, {})).toEqual(['path']);
    expect(missingRequired(f, { path: 'x' })).toEqual([]);
  });
});
