import { describe, expect, it } from 'vitest';
import { parseCurl, shellSplit } from './curl';

const ok = (s: string) => {
  const r = parseCurl(s);
  if ('error' in r) throw new Error(r.error);
  return r;
};

describe('shellSplit', () => {
  it('nháy đơn / kép / $\'…\' / nối dòng', () => {
    expect(shellSplit(`curl 'a b' "c \\"d\\"" $'e\\nf' \\\n g`)).toEqual(['curl', 'a b', 'c "d"', 'e\nf', 'g']);
  });
});

describe('parseCurl', () => {
  it('GET có query tách vào bảng', () => {
    const { patch } = ok(`curl 'https://api.x.com/s?tim=xin+ch%C3%A0o&p=2' -H 'Accept: application/json'`);
    expect(patch.method).toBe('GET');
    expect(patch.url).toBe('https://api.x.com/s');
    expect(patch.query).toEqual([{ key: 'tim', value: 'xin chào' }, { key: 'p', value: '2' }]);
    expect(patch.headers).toEqual([{ key: 'Accept', value: 'application/json' }]);
  });
  it('POST JSON từ -d', () => {
    const { patch } = ok(`curl -X POST https://x.io/a -H "Content-Type: application/json" -d '{"ten":"A"}'`);
    expect(patch).toMatchObject({ method: 'POST', bodyType: 'json', body: '{"ten":"A"}' });
  });
  it('có -d mà không -X thì POST; form urlencoded thành bảng', () => {
    const { patch } = ok(`curl https://x.io/login -d 'email=a%40b.c&pw=1'`);
    expect(patch.method).toBe('POST');
    expect(patch.bodyType).toBe('form');
    expect(patch.form).toEqual([{ key: 'email', value: 'a@b.c' }, { key: 'pw', value: '1' }]);
  });
  it('-u thành header Basic; -b thành Cookie', () => {
    const { patch } = ok(`curl -u user:pass -b 'a=1' https://x.io`);
    expect(patch.headers).toContainEqual({ key: 'Authorization', value: 'Basic dXNlcjpwYXNz' });
    expect(patch.headers).toContainEqual({ key: 'Cookie', value: 'a=1' });
  });
  it('lỗi: không phải curl / thiếu URL', () => {
    expect(parseCurl('wget x')).toEqual({ error: 'Lệnh phải bắt đầu bằng curl' });
    expect(parseCurl('curl -s')).toEqual({ error: 'Không thấy URL trong lệnh curl' });
  });
});
