// Node HTTP (bước 35 N3) – nhãn method / kiểu body, dòng chi tiết thẻ, header bí mật, kiểm JSON. Chạy ở internal/engine/http.go.
import { tr } from '../i18n/lang';
import type { KV, Step } from '../types';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = typeof HTTP_METHODS[number];
// '' = không body (khớp model.BodyTypes)
export type BodyType = '' | 'json' | 'form' | 'text';
export const BODY_TYPES: { id: BodyType; label: string }[] = [{ id: '', get label() { return tr('http.body.none'); } }, { id: 'json', label: 'JSON' }, { id: 'form', label: 'Form' }, { id: 'text', label: 'Text' }];
// Method có body thường gặp – đổi sang thì gợi ý chọn kiểu body
export const hasBody = (m?: string) => m === 'POST' || m === 'PUT' || m === 'PATCH';

// Khớp secretWords trong internal/model/http.go (test chung testdata/secret_keys.json).
const SECRET_WORDS = ['auth', 'token', 'secret', 'pass', 'apikey', 'api-key', 'api_key', 'cookie', 'session', 'signature', 'credential'];
export const isSecretKey = (name: string) => SECRET_WORDS.some((w) => name.toLowerCase().includes(w));

// Thân JSON: rỗng / có biến → chỉ kiểm được lúc chạy (null = không kiểm); còn lại true / false theo cú pháp.
export function jsonBodyValid(body: string): boolean | null {
  if (!body.trim() || body.includes('{{')) return null;
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}

// Dòng chi tiết thẻ: "POST api.example.com/orders · JSON".
export function fmtHTTP(s: Pick<Step, 'method' | 'url' | 'bodyType' | 'query'>): string {
  const u = (s.url ?? '').trim().replace(/^https?:\/\//, '');
  const n = (s.query ?? []).filter((q: KV) => q.key.trim()).length;
  const body = BODY_TYPES.find((b) => b.id === (s.bodyType ?? ''));
  return `${s.method || 'GET'} ${u || tr('http.noUrl')}${n ? ` · ${tr('http.params', { n })}` : ''}${s.bodyType ? ` · ${body?.label}` : ''}`;
}
