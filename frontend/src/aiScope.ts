// Chữ cho hộp hỏi AI chạy kịch bản (bước 31b) – logic thuần, aiAsk.ts / AIRunDialog dùng.

export type AIAsk = { id: string; script: string; path: string; steps: number; from?: string; stopAt?: string; nodes?: string[]; resume?: boolean; batch?: string[] };

// Mô tả phần sẽ chạy: cả kịch bản / từ n3 / đến n5 / cụm n2, n3.
export function aiRunScope(a: AIAsk): string {
  const parts = [a.nodes?.length ? `chỉ ${a.nodes.join(', ')}` : '', a.from ? `từ ${a.from}` : '', a.stopAt ? `đến ${a.stopAt}` : ''].filter(Boolean);
  const scope = parts.length ? parts.join(' ') : `cả kịch bản (${a.steps} node)`;
  return a.resume ? `${scope}, dùng kết quả lần chạy trước` : scope;
}

// Lượt run_batch (bước 61 M2): "a, b, c và 4 kịch bản khác" – hộp hỏi chỉ đủ chỗ vài tên.
export function aiBatchNames(names: string[], max = 5): string {
  const shown = names.slice(0, max).join(', ');
  return names.length > max ? `${shown} và ${names.length - max} kịch bản khác` : shown;
}
