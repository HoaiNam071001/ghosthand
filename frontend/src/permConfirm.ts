// Báo thiếu quyền hệ điều hành trước khi chạy (bước 48 P4): runScript gọi askPerm, PermConfirmDialog hiện + trả lời.
// Không chặn cứng – quyền `unknown` / tự kiểm tra không tính là thiếu, người dùng chọn Vẫn chạy được.
import { useSyncExternalStore } from 'react';

export type PermAsk = { names: string[]; resolve: (run: boolean) => void } | null;
let ask: PermAsk = null;
const listeners = new Set<() => void>();
const set = (a: PermAsk) => {
  ask = a;
  listeners.forEach((l) => l());
};

export const askPerm = (names: string[]) => new Promise<boolean>((resolve) => set({ names, resolve }));

export function answerPerm(run: boolean) {
  ask?.resolve(run);
  set(null);
}

export const usePermAsk = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => ask);
