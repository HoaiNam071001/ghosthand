// Lọc danh sách kịch bản mẫu (bước 33) – logic thuần cho hộp thoại Mẫu thử.
import { fold } from '../fold';
import { STEP_LABEL, StepType } from '../types';
import { tr } from '../i18n/lang';
import type { MsgKey } from '../i18n/vi';

// Khớp samples.Info bên Go (internal/samples).
export type Sample = {
  id: string;
  name: string;
  description: string;
  app: string; // kiểu app: Cơ bản, Chờ / tìm, Form, Shop…
  level: number; // 1 dễ – 3 khó
  page: string; // trang sân thử hoặc URL web thật
  real: boolean;
  prep?: string;
  steps: string[]; // loại bước có trong mẫu
};

export type SampleFilter = { q: string; step: string; app: string }; // '' = tất cả

export const ALL: SampleFilter = { q: '', step: '', app: '' };

export const stepName = (t: string) => STEP_LABEL[t as StepType] ?? t;

export function filterSamples(list: Sample[], f: SampleFilter): Sample[] {
  const words = fold(f.q).split(/\s+/).filter(Boolean);
  return list.filter((s) => {
    if (f.step && !s.steps.includes(f.step)) return false;
    if (f.app && s.app !== f.app) return false;
    if (!words.length) return true;
    const hay = fold([s.name, s.description, s.app, s.page, ...s.steps.map(stepName)].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

// Kiểu app theo thứ tự xuất hiện (danh sách đã sắp theo độ khó).
export const appsOf = (list: Sample[]) => [...new Set(list.map((s) => s.app))];

// Loại bước → số mẫu có loại đó, theo thứ tự STEP_LABEL (thứ tự bảng Thêm bước).
export function stepCounts(list: Sample[]): { type: string; count: number }[] {
  const n = new Map<string, number>();
  list.forEach((s) => s.steps.forEach((t) => n.set(t, (n.get(t) ?? 0) + 1)));
  const order = Object.keys(STEP_LABEL);
  return [...n].map(([type, count]) => ({ type, count }))
    .sort((a, b) => (order.indexOf(a.type) + 1 || 999) - (order.indexOf(b.type) + 1 || 999));
}

export const levelText = (l: number) => (l >= 1 && l <= 3 ? tr(`smp.lv${l}` as MsgKey) : '');
