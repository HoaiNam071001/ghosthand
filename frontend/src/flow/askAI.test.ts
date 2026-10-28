import { describe, expect, it } from 'vitest';
import { fmtAskAI, isLocalAI, isSecretKey } from './askAI';

describe('askAI', () => {
  it('dòng chi tiết', () => {
    expect(fmtAskAI({})).toBe('(chưa nhập câu hỏi)');
    expect(fmtAskAI({ prompt: 'Có cần trả lời?', aiKind: 'anthropic', aiFormat: 'json', aiImage: 'screen' })).toBe('Anthropic · JSON · kèm ảnh màn hình · Có cần trả lời?');
    expect(fmtAskAI({ prompt: 'x', aiBaseUrl: 'http://localhost:11434/v1', aiModel: 'llama3' })).toBe('llama3 · x');
    expect(fmtAskAI({ prompt: 'x', aiBaseUrl: 'http://localhost:11434/v1' })).toBe('AI trên máy · x');
  });
  it('nhận AI chạy trên máy', () => {
    expect(isLocalAI('http://localhost:11434/v1')).toBe(true);
    expect(isLocalAI('http://127.0.0.1:1234')).toBe(true);
    expect(isLocalAI('https://api.openai.com/v1')).toBe(false);
    expect(isLocalAI('http://localhost.evil.com/v1')).toBe(false);
  });
  it('key chỉ là secret', () => {
    expect(isSecretKey('')).toBe(true);
    expect(isSecretKey('{{secret.openai_key}}')).toBe(true);
    expect(isSecretKey('sk-abc123')).toBe(false);
    expect(isSecretKey('Bearer {{secret.k}}')).toBe(false);
  });
});
