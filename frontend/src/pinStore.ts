// Ghim output node (bước 31c): kết quả node giữ trên máy theo kịch bản (Go: internal/store/pins.go), không ghi vào file
// kịch bản. Chạy từ app thì node ghim không chạy mà trả luôn kết quả đã ghim (runScript gửi kèm `pins`).
import { useSyncExternalStore } from 'react';
import { ClearPin, GetPins, SetPin } from '../wailsjs/go/main/App';
import { model } from '../wailsjs/go/models';
import { getEditor, subscribe } from './store';
import { inWails } from './windowMode';
import type { StepResult } from './types';

type Pins = Record<string, StepResult>;

let pins: Pins = {};
let key = '';
const listeners = new Set<() => void>();
const set = (p: Pins) => {
  pins = p;
  listeners.forEach((l) => l());
};

const owner = () => {
  const { script, path } = getEditor();
  return { name: script.name, path: path ?? '' };
};

async function load() {
  const { name, path } = owner();
  const got = ((await GetPins(name, path).catch(() => ({}))) ?? {}) as unknown as Pins;
  set(got);
}

// Mở kịch bản khác / lưu sang tên khác: ghim theo kịch bản mới.
if (inWails) {
  subscribe(() => {
    const { name, path } = owner();
    const k = `${path}\n${name}`;
    if (k === key) return;
    key = k;
    void load();
  });
}

export const getPins = () => pins;
export const usePins = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => pins);

// Ghim kết quả r (chỉ node đã chạy thành công) – node được ghim thì lần chạy sau không chạy lại.
export async function pinResult(r: StepResult) {
  const { name, path } = owner();
  await SetPin(name, path, model.StepResult.createFrom(r));
  set({ ...pins, [r.nodeId]: r });
}

export async function unpin(nodeId: string) {
  const { name, path } = owner();
  await ClearPin(name, path, nodeId);
  const { [nodeId]: _, ...rest } = pins;
  set(rest);
}
