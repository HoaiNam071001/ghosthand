// Quyền hệ điều hành (bước 48): trạng thái từng quyền, kiểm tra lại, xin quyền, mở System Settings.
import { useSyncExternalStore } from 'react';
import { OpenPermissionSettings, Permissions, RequestPermission } from '../../wailsjs/go/main/App';
import { perm } from '../../wailsjs/go/models';
import { missingOf, needs } from '../flow/perms';
import type { Script } from '../types';
import { errorText } from '../engineStore';
import { inWails } from '../windowMode';

type PermState = { items: perm.Item[] | null; busy: string; error: string };
let state: PermState = { items: null, busy: '', error: '' };
const listeners = new Set<() => void>();
const set = (p: Partial<PermState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};
export const usePerms = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => state);

export async function refreshPerms() {
  if (!inWails) return set({ items: [] });
  try {
    set({ items: await Permissions(), error: '' });
  } catch (e) {
    set({ error: errorText(e) });
  }
}

// Bật hộp thoại xin quyền của hệ điều hành rồi cập nhật dòng đó; quyền bị từ chối từ trước thì hệ điều hành không hỏi lại
// → người dùng phải bật tay trong System Settings (nút Mở System Settings).
export async function requestPerm(id: string) {
  set({ busy: id });
  try {
    const it = await RequestPermission(id);
    set({ items: (state.items ?? []).map((x) => (x.id === id ? it : x)), error: '' });
  } catch (e) {
    set({ error: errorText(e) });
  } finally {
    set({ busy: '' });
  }
}

export const openPermSettings = (id: string) =>
  OpenPermissionSettings(id).then(() => set({ error: '' })).catch((e) => set({ error: errorText(e) }));

// Quyền kịch bản cần mà hệ điều hành báo chưa cấp – kiểm tra lại ngay trước khi chạy cho chắc.
export async function missingForRun(sc: Pick<Script, 'steps'>): Promise<perm.Item[]> {
  await refreshPerms();
  const ids = missingOf(state.items, needs(sc));
  return (state.items ?? []).filter((it) => ids.includes(it.id as never));
}

// Theo dõi lúc mở app và mỗi lần cửa sổ lấy lại focus (cấp quyền xong ở System Settings rồi quay lại) để chấm cảnh báo trên node luôn đúng.
export function watchPerms() {
  refreshPerms();
  window.addEventListener('focus', refreshPerms);
  return () => window.removeEventListener('focus', refreshPerms);
}
