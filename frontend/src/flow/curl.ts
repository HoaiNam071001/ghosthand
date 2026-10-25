// Lệnh curl dán từ DevTools ("Copy as cURL") / tài liệu API → các trường của node HTTP (bước 50 E3). Thuần chữ, không chạy gì.
import type { KV, Step } from '../types';
import { HTTP_METHODS, type BodyType, type HttpMethod } from './http';

export type CurlResult = { patch: Partial<Step>; notes: string[] } | { error: string };

// Tách như shell: '…' nguyên văn, "…" có \ thoát, $'…' kiểu bash (\n \t \' \\), \<xuống dòng> nối dòng.
export function shellSplit(src: string): string[] {
  const out: string[] = [];
  let cur = '', has = false, i = 0;
  const flush = () => { if (has) out.push(cur); cur = ''; has = false; };
  const text = src.replace(/\\\r?\n/g, ' ');
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) { flush(); i++; continue; }
    has = true;
    if (c === "'") {
      const j = text.indexOf("'", i + 1);
      cur += text.slice(i + 1, j < 0 ? undefined : j); i = j < 0 ? text.length : j + 1;
    } else if (c === '$' && text[i + 1] === "'") {
      i += 2;
      while (i < text.length && text[i] !== "'") {
        if (text[i] === '\\' && i + 1 < text.length) {
          const n = text[i + 1];
          cur += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'r' ? '\r' : n; i += 2;
        } else cur += text[i++];
      }
      i++;
    } else if (c === '"') {
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\' && '"\\$`'.includes(text[i + 1] ?? '')) { cur += text[i + 1]; i += 2; } else cur += text[i++];
      }
      i++;
    } else if (c === '\\' && i + 1 < text.length) { cur += text[i + 1]; i += 2; }
    else { cur += c; i++; }
  }
  flush();
  return out;
}

const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode']);
const IGNORED_WITH_VALUE = new Set(['-o', '--output', '-m', '--max-time', '--connect-timeout', '-w', '--write-out', '--proxy', '-x', '--cacert', '--cert', '-E', '--key', '--retry', '-T']);

const dec = (s: string) => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; } };
const pairs = (s: string): KV[] => s.split('&').filter(Boolean).map((p) => {
  const k = p.indexOf('=');
  return k < 0 ? { key: dec(p), value: '' } : { key: dec(p.slice(0, k)), value: dec(p.slice(k + 1)) };
});

export function parseCurl(input: string): CurlResult {
  const args = shellSplit(input.trim());
  if (args[0]?.toLowerCase() === 'curl') args.shift();
  else return { error: 'Lệnh phải bắt đầu bằng curl' };
  let url = '', method = '';
  const headers: KV[] = [], data: string[] = [], forms: KV[] = [], notes: string[] = [];
  let user = '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const val = () => args[++i] ?? '';
    if (a === '-X' || a === '--request') method = val().toUpperCase();
    else if (a === '-H' || a === '--header') {
      const h = val(), k = h.indexOf(':');
      if (k > 0) headers.push({ key: h.slice(0, k).trim(), value: h.slice(k + 1).trim() });
    } else if (DATA_FLAGS.has(a)) data.push(val());
    else if (a === '-F' || a === '--form' || a === '--form-string') { const f = val(), k = f.indexOf('='); forms.push(k < 0 ? { key: f, value: '' } : { key: f.slice(0, k), value: f.slice(k + 1) }); }
    else if (a === '-u' || a === '--user') user = val();
    else if (a === '-b' || a === '--cookie') headers.push({ key: 'Cookie', value: val() });
    else if (a === '-A' || a === '--user-agent') headers.push({ key: 'User-Agent', value: val() });
    else if (a === '-e' || a === '--referer') headers.push({ key: 'Referer', value: val() });
    else if (a === '--url') url = val();
    else if (IGNORED_WITH_VALUE.has(a)) val();
    else if (a.startsWith('-')) { /* cờ không giá trị: -L -s -k --compressed -i … bỏ qua */ }
    else if (!url) url = a;
  }
  if (!url) return { error: 'Không thấy URL trong lệnh curl' };
  if (user) headers.push({ key: 'Authorization', value: `Basic ${btoa(unescape(encodeURIComponent(user)))}` });

  let query: KV[] | undefined;
  const q = url.indexOf('?');
  if (q >= 0) {
    const hash = url.indexOf('#', q);
    query = pairs(url.slice(q + 1, hash < 0 ? undefined : hash));
    url = url.slice(0, q);
  }

  const ctype = headers.find((h) => h.key.toLowerCase() === 'content-type')?.value.toLowerCase() ?? '';
  const body = data.join('&');
  let bodyType: BodyType = '';
  let form: KV[] | undefined, text: string | undefined;
  if (forms.length) { bodyType = 'form'; form = forms; notes.push('-F gửi multipart – node gửi dạng form thường, kiểm tra lại với API'); }
  else if (body) {
    if (ctype.includes('json') || /^\s*[{[]/.test(body)) { bodyType = 'json'; text = body; }
    else if (ctype.includes('x-www-form-urlencoded') || (!ctype && /^[^=&\s]+=/.test(body))) { bodyType = 'form'; form = pairs(body); }
    else { bodyType = 'text'; text = body; }
  }
  let m = method || (bodyType ? 'POST' : 'GET');
  if (!HTTP_METHODS.includes(m as HttpMethod)) { notes.push(`Method ${m} chưa hỗ trợ – đặt GET`); m = 'GET'; }
  if (headers.some((h) => /^sec-|^:/.test(h.key.toLowerCase()))) notes.push('Có header của trình duyệt (sec-…) – xoá bớt nếu API không cần');
  return {
    patch: {
      method: m as HttpMethod, url, query: query?.length ? query : undefined, headers: headers.length ? headers : undefined,
      bodyType: bodyType || undefined, body: text, form,
    },
    notes,
  };
}
