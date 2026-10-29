// Icon chọn được cho node của tôi (bước 55 M5) – lấy từ bộ icon có sẵn của app.
import { STEP_ICON, StepIconName } from '../icons';

export const CUSTOM_ICONS: StepIconName[] = ['mcpTool', 'file', 'http', 'askAI', 'clipboard', 'notify', 'zip', 'sysInfo', 'screenshot', 'type', 'open', 'app'];
export const DEFAULT_CUSTOM_ICON: StepIconName = 'mcpTool';

// Icon đã lưu (chuỗi tự do từ file) → icon hợp lệ, không có thì mặc định.
export const customIcon = (name?: string): StepIconName => (name && name in STEP_ICON ? (name as StepIconName) : DEFAULT_CUSTOM_ICON);
