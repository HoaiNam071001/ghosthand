// Từ điển tiếng Việt – nguồn chuẩn của chữ giao diện (bước 64). Thêm key ở đây rồi thêm bản dịch ở en.ts (tsc báo thiếu).
export const vi = {
  'lang.label': 'Ngôn ngữ',
  'lang.system': 'Theo hệ thống',
  'lang.vi': 'Tiếng Việt',
  'lang.en': 'English',
  'lang.current': 'Ngôn ngữ: {name}',
  'settings.ui': 'Giao diện',
  'settings.ui.language': 'Ngôn ngữ',
  'settings.ui.languageHint': 'Đổi ngay, không cần mở lại app. Phần chưa dịch tạm hiện tiếng Việt.',
  'theme.light': 'Sáng',
  'theme.dark': 'Tối',
  'theme.system': 'Theo hệ thống',
  'theme.current': 'Giao diện: {name}',
} as const;

export type MsgKey = keyof typeof vi;
