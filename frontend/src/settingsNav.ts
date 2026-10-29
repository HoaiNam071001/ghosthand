// Yêu cầu mở Cài đặt ở một tab (vd nút "Mở Cài đặt → Quyền" từ cảnh báo thiếu quyền); AppSettings lắng nghe.
export type SettingsTab = 'storage' | 'overlay' | 'secrets' | 'perms' | 'api' | 'mcp' | 'servers' | 'about';
// focus: id mục cần nhìn thấy (vd quyền thiếu khiến node lỗi permission – tab Quyền ghim + tô mục đó).
type Listener = (tab: SettingsTab, focus?: string) => void;
const listeners = new Set<Listener>();
export const openSettings = (tab: SettingsTab, focus?: string) => listeners.forEach((l) => l(tab, focus));
export const onOpenSettings = (l: Listener) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
