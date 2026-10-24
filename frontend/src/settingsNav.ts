// Yêu cầu mở Cài đặt ở một tab (vd nút "Mở Cài đặt → Quyền" từ cảnh báo thiếu quyền); AppSettings lắng nghe.
export type SettingsTab = 'storage' | 'secrets' | 'perms' | 'api' | 'mcp';
const listeners = new Set<(tab: SettingsTab) => void>();
export const openSettings = (tab: SettingsTab) => listeners.forEach((l) => l(tab));
export const onOpenSettings = (l: (tab: SettingsTab) => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
