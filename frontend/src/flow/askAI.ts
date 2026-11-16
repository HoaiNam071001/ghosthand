// Node Hỏi AI (bước 31d) – lựa chọn và dòng chi tiết thẻ. Chạy ở internal/engine/askai.go.
import type { Step } from '../types';
import { tr } from '../i18n/lang';

export type AIKind = '' | 'openai' | 'anthropic' | 'gemini';
export type AIImage = '' | 'screen' | 'file';
export type AIFormat = '' | 'json';

export const AI_KINDS: { id: AIKind; label: string }[] = [
  { id: '', get label() { return tr('ai.opt.0'); } },
  { id: 'anthropic', get label() { return tr('ai.opt.1'); } },
  { id: 'gemini', get label() { return tr('ai.opt.2'); } },
];
// Ô Nhà cung cấp của node: trống = dùng mặc định ở Cài đặt → Hỏi AI (chưa đặt thì OpenAI); chọn rõ loại để không thừa hưởng.
export const NODE_AI_KINDS: { id: AIKind; label: string }[] = [
  { id: '', get label() { return tr('ai.opt.3'); } },
  { id: 'openai', get label() { return tr('ai.opt.4'); } },
  { id: 'anthropic', get label() { return tr('ai.opt.5'); } },
  { id: 'gemini', get label() { return tr('ai.opt.6'); } },
];
export const AI_IMAGES: { id: AIImage; label: string }[] = [
  { id: '', get label() { return tr('ai.opt.7'); } },
  { id: 'screen', get label() { return tr('ai.opt.8'); } },
  { id: 'file', get label() { return tr('ai.opt.9'); } },
];
export const AI_FORMATS: { id: AIFormat; label: string }[] = [
  { id: '', get label() { return tr('ai.opt.10'); } },
  { id: 'json', get label() { return tr('ai.opt.11'); } },
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
  if (!prompt) return tr('ai.d.noPrompt');
  const who = isLocalAI(s.aiBaseUrl) ? tr('ai.d.local') : s.aiKind === 'anthropic' ? 'Anthropic' : s.aiKind === 'gemini' ? 'Gemini' : s.aiKind === 'openai' ? 'OpenAI' : tr('ai.d.default');
  const parts = [s.aiModel?.trim() || who, s.aiFormat === 'json' ? 'JSON' : '', s.aiImage === 'screen' ? tr('ai.d.withShot') : s.aiImage === 'file' ? tr('ai.d.withFile') : '', prompt];
  return parts.filter(Boolean).join(' · ');
}

// Key hợp lệ: trống hoặc đúng một {{secret.<tên>}} (khớp script/aicheck.go).
export function isSecretKey(k?: string): boolean {
  const t = (k ?? '').trim();
  return t === '' || /^\{\{\s*secret\.[A-Za-z][A-Za-z0-9_]*\s*\}\}$/.test(t);
}
