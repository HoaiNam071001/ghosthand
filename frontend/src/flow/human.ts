// Thao tác giống người (bước 34) – nhãn mức, chữ giải thích, node nào áp dụng. Công thức chạy ở internal/humanize (Go).
import { tr } from '../i18n/lang';
import { isWebStep } from './web';
import type { HumanLevel, Step } from '../types';

export const HUMAN_LEVELS: { id: HumanLevel; label: string }[] = [
  { id: 'off', get label() { return tr('fx.hm.off'); } }, { id: 'low', get label() { return tr('fx.hm.low'); } },
  { id: 'medium', get label() { return tr('fx.hm.medium'); } }, { id: 'high', get label() { return tr('fx.hm.high'); } },
];

export const humanLabel = (lv: HumanLevel) => HUMAN_LEVELS.find((l) => l.id === lv)?.label ?? lv;

// Mức kịch bản: trống = tắt (file cũ); mức của node: trống = theo kịch bản.
export const scriptHuman = (lv?: HumanLevel): HumanLevel => lv || 'off';
export const effectiveHuman = (script?: HumanLevel, node?: HumanLevel): HumanLevel => node || scriptHuman(script);

// Mô tả mỗi mức (khớp profiles trong internal/humanize/profile.go).
export function humanHint(lv: HumanLevel): string {
  switch (lv) {
    case 'low': return tr('fx.hh.low');
    case 'medium': return tr('fx.hh.medium');
    case 'high': return tr('fx.hh.high');
    default: return tr('fx.hh.off');
  }
}

// Node điều khiển chuột / phím thật – có ô ghi đè mức (node web chạy nền không đụng chuột / phím).
export function usesHuman(s: Pick<Step, 'type' | 'webBackground' | 'scrollMode'>): boolean {
  if (isWebStep(s.type)) {
    if (s.type === 'webWait' || s.type === 'webRead' || s.webBackground) return false;
    return s.type !== 'webScroll' || s.scrollMode === 'in' || s.scrollMode === 'until';
  }
  return ['click', 'double', 'hold', 'drag', 'path', 'type', 'key', 'scroll', 'clickImage'].includes(s.type);
}
