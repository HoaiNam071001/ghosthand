import { tr } from './i18n/lang';
// Chữ cho hộp hỏi AI chạy kịch bản (bước 31b) – logic thuần, aiAsk.ts / AIRunDialog dùng.

// update – AI xin cài bản mới (update_app, bước 59 U5) thay vì chạy kịch bản
export type AIUpdateAsk = { current: string; latest: string; notes?: string };
export type AIAsk = { id: string; script: string; path: string; steps: number; from?: string; stopAt?: string; nodes?: string[]; resume?: boolean; batch?: string[]; changed?: boolean; update?: AIUpdateAsk };

// Mô tả phần sẽ chạy: cả kịch bản / từ n3 / đến n5 / cụm n2, n3.
export function aiRunScope(a: AIAsk): string {
  const parts = [a.nodes?.length ? tr('ais2.only', { l: a.nodes.join(', ') }) : '', a.from ? tr('ais2.from', { n: a.from }) : '', a.stopAt ? tr('ais2.to', { n: a.stopAt }) : ''].filter(Boolean);
  const scope = parts.length ? parts.join(' ') : tr('ais2.all', { n: a.steps });
  return a.resume ? tr('ais2.resume', { scope }) : scope;
}

// Lượt run_batch (bước 61 M2): "a, b, c và 4 kịch bản khác" – hộp hỏi chỉ đủ chỗ vài tên.
export function aiBatchNames(names: string[], max = 5): string {
  const shown = names.slice(0, max).join(', ');
  return names.length > max ? tr('ais2.more', { shown, n: names.length - max }) : shown;
}
