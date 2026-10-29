// Node Gọi tool MCP (bước 55 M4): dựng form từ inputSchema (JSON Schema) của tool. Phần không dựng được → ô JSON của chính trường đó.
// Đối số lưu một chỗ: chuỗi JSON object ở Step.mcpArgs; hàm ở đây chỉ đọc / ghi từng trường.

export type FieldKind = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'stringList' | 'json';

export type SchemaField = {
  name: string;
  kind: FieldKind;
  required: boolean;
  desc: string;
  options: string[]; // kind enum
  def?: unknown;
};

type Schema = { type?: unknown; properties?: Record<string, Prop>; required?: unknown };
type Prop = { type?: unknown; description?: unknown; enum?: unknown; default?: unknown; items?: { type?: unknown } };

const asType = (t: unknown): string => (Array.isArray(t) ? String(t.find((x) => x !== 'null') ?? '') : typeof t === 'string' ? t : '');

function kindOf(p: Prop): FieldKind {
  if (Array.isArray(p.enum) && p.enum.length > 0 && p.enum.every((v) => typeof v === 'string')) return 'enum';
  switch (asType(p.type)) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'integer': return 'integer';
    case 'boolean': return 'boolean';
    case 'array': return asType(p.items?.type) === 'string' ? 'stringList' : 'json';
    default: return 'json';
  }
}

// Các trường của schema (theo thứ tự khai báo, trường bắt buộc lên trước). Schema không phải object → [].
export function schemaFields(raw: unknown): SchemaField[] {
  const s = raw as Schema | null | undefined;
  if (!s || typeof s !== 'object' || !s.properties || typeof s.properties !== 'object') return [];
  const req = new Set(Array.isArray(s.required) ? (s.required as unknown[]).map(String) : []);
  const out = Object.entries(s.properties).map(([name, p]) => ({
    name, kind: kindOf(p ?? {}), required: req.has(name), desc: typeof p?.description === 'string' ? p.description : '',
    options: Array.isArray(p?.enum) ? (p.enum as unknown[]).map(String) : [], def: p?.default,
  }));
  return [...out.filter((f) => f.required), ...out.filter((f) => !f.required)];
}

// Chuỗi mcpArgs → object (trống = {}). null = không phải JSON object (có {{biến}} ngoài chuỗi…) → chỉ sửa được ở ô JSON.
export function parseArgs(text?: string): Record<string, unknown> | null {
  if (!text?.trim()) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Đặt (hoặc xoá, khi value undefined / rỗng) một trường rồi trả chuỗi mcpArgs mới ("" khi hết đối số).
export function setArg(text: string | undefined, name: string, value: unknown): string {
  const cur = { ...(parseArgs(text) ?? {}) };
  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) delete cur[name];
  else cur[name] = value;
  return Object.keys(cur).length ? JSON.stringify(cur) : '';
}

// Ô số: "" = bỏ, số hợp lệ = số, còn lại (chữ lẫn biến) giữ chuỗi để người dùng sửa tiếp – ô báo sai bằng numberError.
export function parseNumberInput(text: string, integer: boolean): number | string | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) && (!integer || Number.isInteger(n)) ? n : t;
}

export const numberError = (v: unknown) => (typeof v === 'string' ? 'Phải là số – biến số đặt trong ô JSON: {"n":{{n1.output.value}}}' : '');

// stringList ↔ nhiều dòng
export const listToText = (v: unknown): string => (Array.isArray(v) ? v.map(String).join('\n') : '');
export const textToList = (t: string): string[] => t.split('\n').map((x) => x.trim()).filter(Boolean);

// Tool có trường bắt buộc nào chưa điền (kiểm khi mở form).
export function missingRequired(fields: SchemaField[], args: Record<string, unknown> | null): string[] {
  return fields.filter((f) => f.required && (args?.[f.name] === undefined)).map((f) => f.name);
}
