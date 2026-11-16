// Yêu cầu mở Cài đặt ở một tab (vd nút "Mở Cài đặt → Quyền" từ cảnh báo thiếu quyền): mở trang Tệp → Cài đặt (shellStore).
export type SettingsTab = 'storage' | 'overlay' | 'browser' | 'secrets' | 'perms' | 'api' | 'mcp' | 'askai' | 'servers' | 'sync' | 'about';
import { showSettings } from './shellStore';

// focus: id mục cần nhìn thấy (vd quyền thiếu khiến node lỗi permission – tab Quyền ghim + tô mục đó).
export const openSettings = (tab: SettingsTab, focus?: string) => showSettings(tab, focus ?? '');
