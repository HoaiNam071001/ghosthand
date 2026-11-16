// Tên phím robotgo (gợi ý / kiểm tra trong form Phím tắt) và chữ hiển thị tổ hợp phím.
import type { Step } from './types';
import { tr } from './i18n/lang';
import type { MsgKey } from './i18n/vi';

// Tên phím robotgo hỗ trợ (ngoài các ký tự đơn như a, 1, /) – gợi ý trong form và kiểm tra.
export const KEY_NAMES = [
  'enter', 'tab', 'esc', 'space', 'backspace', 'delete', 'up', 'down', 'left', 'right',
  'home', 'end', 'pageup', 'pagedown', 'insert', 'capslock', 'printscreen', 'menu',
  ...Array.from({ length: 24 }, (_, i) => `f${i + 1}`),
  'num0', 'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9', 'num_enter',
  'audio_mute', 'audio_vol_down', 'audio_vol_up', 'audio_play', 'audio_next', 'audio_prev',
];
export const isValidKey = (k: string) => [...k].length === 1 || KEY_NAMES.includes(k);

// Mô tả (key.<tên>) cho gợi ý tên phím trong form.
const FIXED_KEYS = new Set<string>(['audio_mute', 'audio_next', 'audio_play', 'audio_prev', 'audio_vol_down', 'audio_vol_up', 'backspace', 'capslock', 'delete', 'down', 'end', 'enter', 'esc', 'home', 'insert', 'left', 'menu', 'num_enter', 'pagedown', 'pageup', 'printscreen', 'right', 'space', 'tab', 'up']);
export const keyLabel = (k: string) =>
  FIXED_KEYS.has(k) ? tr(`key.${k}` as MsgKey) : /^f\d+$/.test(k) ? tr('key.fn', { n: k.toUpperCase() }) : /^num\d$/.test(k) ? tr('key.num', { n: k.slice(3) }) : '';

const cap = (k: string) => k[0].toUpperCase() + k.slice(1);
// chord: "Ctrl + C + T" · sequence: "Ctrl + C → T"
export const fmtKey = (s: Step) => {
  const keys = s.keys.map(cap).join(s.keyMode === 'sequence' ? ' → ' : ' + ');
  return [...s.modifiers.map(cap), keys].filter(Boolean).join(' + ') || '—';
};
