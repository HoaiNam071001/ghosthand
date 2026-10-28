// Node Hỏi AI (bước 31d) – lựa chọn và dòng chi tiết thẻ. Chạy ở internal/engine/askai.go.
import type { Step } from '../types';

export type AIKind = '' | 'openai' | 'anthropic';
export type AIImage = '' | 'screen' | 'file';
export type AIFormat = '' | 'json';

export const AI_KINDS: { id: AIKind; label: string }[] = [
  { id: '', label: 'OpenAI / tương thích OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
];
export const AI_IMAGES: { id: AIImage; label: string }[] = [
  { id: '', label: 'Chỉ chữ' },
  { id: 'screen', label: 'Ảnh màn hình' },
  { id: 'file', label: 'File ảnh' },
];
export const AI_FORMATS: { id: AIFormat; label: string }[] = [
  { id: '', label: 'Chữ' },
  { id: 'json', label: 'JSON' },
];

// Địa chỉ gợi ý cho AI chạy trên máy (Ollama) – không cần key, ảnh không ra khỏi máy.
export const LOCAL_AI_URL = 'http://localhost:11434/v1';

// AI chạy trên máy: địa chỉ localhost / 127.0.0.1 – không tốn tiền, không gửi ra ngoài.
export function isLocalAI(url?: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test((url ?? '').trim());
}

// Dòng chi tiết thẻ: "Anthropic · json · kèm ảnh màn hình · Tin nhắn này có…"
export function fmtAskAI(s: Partial<Pick<Step, 'aiKind' | 'aiBaseUrl' | 'aiModel' | 'aiImage' | 'aiFormat' | 'prompt'>>): string {
  const prompt = s.prompt?.trim();
  if (!prompt) return '(chưa nhập câu hỏi)';
  const who = isLocalAI(s.aiBaseUrl) ? 'AI trên máy' : s.aiKind === 'anthropic' ? 'Anthropic' : 'OpenAI';
  const parts = [s.aiModel?.trim() || who, s.aiFormat === 'json' ? 'JSON' : '', s.aiImage === 'screen' ? 'kèm ảnh màn hình' : s.aiImage === 'file' ? 'kèm file ảnh' : '', prompt];
  return parts.filter(Boolean).join(' · ');
}

// Key hợp lệ: trống hoặc đúng một {{secret.<tên>}} (khớp script/aicheck.go).
export function isSecretKey(k?: string): boolean {
  const t = (k ?? '').trim();
  return t === '' || /^\{\{\s*secret\.[A-Za-z][A-Za-z0-9_]*\s*\}\}$/.test(t);
}
