// Kiểm tra bản mới (Cài đặt → Giới thiệu): phiên bản đang chạy + kết quả hỏi GitHub Releases. Mở app có bản mới thì Go
// bắn event update:available (scriptFile.ts báo nhẹ); nút Kiểm tra hỏi lại tay.
import { useSyncExternalStore } from 'react';
import { AppVersion, CheckUpdate, InstallUpdate, OpenReleasePage } from '../../wailsjs/go/main/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { update } from '../../wailsjs/go/models';
import { errorText } from '../engineStore';
import { inWails } from '../windowMode';

// phase: '' (chưa cài) | download | install | restart; done / total = byte đã tải
type Progress = { phase: string; done: number; total: number };
type UpdateState = { version: string; info: update.Info | null; busy: boolean; error: string; progress: Progress | null };
let state: UpdateState = { version: '', info: null, busy: false, error: '', progress: null };
const listeners = new Set<() => void>();
const set = (p: Partial<UpdateState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};
export const useUpdate = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => state);

export async function loadVersion() {
  if (inWails && !state.version) set({ version: await AppVersion().catch(() => '') });
}

export async function checkUpdate() {
  if (!inWails) return;
  set({ busy: true, error: '' });
  try {
    set({ info: await CheckUpdate() });
  } catch (e) {
    set({ error: errorText(e) });
  } finally {
    set({ busy: false });
  }
}

// Go báo có bản mới lúc mở app – giữ kết quả để tab Giới thiệu hiện luôn.
export const setUpdateInfo = (info: update.Info) => set({ info });

export const openReleasePage = (url: string) => OpenReleasePage(url).catch((e) => set({ error: errorText(e) }));

// Cập nhật ngay: Go tải + kiểm sha256 + cài rồi tự thoát / mở lại; tiến độ về qua event update:progress.
export async function installUpdate() {
  if (!inWails) return;
  set({ progress: { phase: 'download', done: 0, total: 0 }, error: '' });
  try {
    await InstallUpdate();
  } catch (e) {
    set({ progress: null, error: errorText(e) });
  }
}

if (inWails) EventsOn('update:progress', (p: Progress) => set({ progress: p }));
