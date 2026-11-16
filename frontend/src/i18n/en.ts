// Bản tiếng Anh – phải đủ mọi key của vi.ts (kiểu Record báo thiếu lúc build).
import type { MsgKey } from './vi';

export const en: Record<MsgKey, string> = {
  'lang.label': 'Language',
  'lang.system': 'Follow system',
  'lang.vi': 'Tiếng Việt',
  'lang.en': 'English',
  'lang.current': 'Language: {name}',
  'settings.ui': 'Appearance',
  'settings.ui.language': 'Language',
  'settings.ui.languageHint': 'Applies immediately, no restart needed. Parts not translated yet stay in Vietnamese.',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'Follow system',
  'theme.current': 'Appearance: {name}',
};
