import { useSyncExternalStore } from 'react';
import { DangerCheck, InBackground, RunScript, ValidateScript } from '../wailsjs/go/main/App';
import { askDanger } from './dangerConfirm';
import { askPerm } from './permConfirm';
import { missingForRun } from './store/permStore';
import { model, session } from '../wailsjs/go/models';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { getPins } from './pinStore';
import { Script } from './types';
import { inWails, setWindowMode } from './windowMode';

// Khớp struct Progress trong internal/engine/engine.go (chỉ đi qua event nên Wails không sinh type).
export type Progress = {
  loop: number;
  loops: number; // 0 = vô hạn
  step: number; // số thứ tự node đang chạy (thứ tự hiển thị flowOrder, trong các node đang bật)
  total: number;
  nodeId?: string; // node đang chạy (bước 20)
  ref?: string;
  clicks: number;
  elapsedMs: number; // không tính thời gian tạm dừng
  paused: boolean;
  pausedBy?: 'touch'; // tạm dừng vì người dùng đụng chuột lúc AI chạy (engine.PausedTouch)
  retry?: number; // đang thử lại lần thứ mấy (0 / trống = lần đầu)
  retries?: number; // số lần thử lại tối đa của bước hiện tại
  wait?: { kind: 'image' | 'text' | 'pixel' | 'web' | 'cond' | 'time' | 'window' | 'app' | 'screen'; elapsedMs: number; timeoutMs: number; best: number }; // đang chờ ảnh / pixel (internal/engine/imagestep.go)
  break?: 'breakpoint' | 'step'; // debug: đang dừng trước node nodeId (Tiếp / F10)
  from?: { ref: string; port: string }; // node vừa chạy + cổng đã đi tới node này
  counter?: { ref: string; count: number; max: number }; // node Đếm gần nhất còn lượt (đang trong vòng lặp của nó)
};

// lastError: lỗi của lần chạy gần nhất – giữ ở store vì màn gọi RunScript bị gỡ khi chuyển sang mini bar.
// stopReason: lý do lần dừng gần nhất ('f8' | 'corner'), '' nếu chạy hết / dừng bằng nút.
type EngineState = {
  running: boolean;
  progress: Progress | null;
  receivedAt: number;
  lastError: string;
  stopReason: string;
  countdown: number; // giây còn lại trước khi chạy, 0 = không đếm ngược
  hotkeyError: string; // Go không nghe được phím toàn cục (thiếu quyền)
  preset: string; // bộ giá trị input của lần chạy này ('' = tự điền / không có input) – hiện trên thanh mini
  failedStep: string; // id bước làm lần chạy trước dừng vì lỗi – thẻ bước viền đỏ
  source: string; // ai chạy lần này: user | schedule | cli | api | ai (session.Source*) – thanh mini hiện chip AI
};

// Store chung nghe event từ Go ngay khi load, để màn mở sau (mini bar) vẫn có dữ liệu mới nhất.
let state: EngineState = {
  running: false, progress: null, receivedAt: 0, lastError: '', stopReason: '', countdown: 0, hotkeyError: '', preset: '', failedStep: '', source: 'user',
};
const listeners = new Set<() => void>();
let external = false; // lần chạy đang diễn ra bắt đầu từ ngoài app (đã tự thu thành thanh mini)
const set = (patch: Partial<EngineState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

if (inWails) {
  EventsOn('engine:state', (running: boolean) => set(running ? { running, progress: null, lastError: '', stopReason: '', failedStep: '' } : { running, countdown: 0 }));
  EventsOn('engine:failed', (f: { stepId: string }) => set({ failedStep: f.stepId }));
  EventsOn('engine:countdown', (countdown: number) => set({ countdown }));
  EventsOn('hotkey:error', (hotkeyError: string) => set({ hotkeyError }));
  EventsOn('engine:stopped', (stopReason: string) => set({ stopReason }));
  EventsOn('engine:progress', (progress: Progress) => set({ progress, receivedAt: Date.now() }));
  // Chạy từ ngoài (API / CLI / hẹn giờ – bước 22, AI – 31): không qua runScript nên tự thu thành thanh mini, xong thì về
  // màn chính – trừ khi app do AI mở nền (InBackground): giữ thanh mini, người dùng bấm Dừng trên thanh mới mở màn chính.
  EventsOn('run:started', (r: { source: string; preset?: string }) => {
    if (r.source === 'user') return;
    set({ preset: r.preset ?? '', source: r.source });
    external = true;
    void setWindowMode('minibar');
  });
  EventsOn('run:ended', (st: { error?: string }) => {
    if (!external) return;
    external = false;
    if (st.error) set({ lastError: st.error });
    void InBackground().then((bg) => {
      if (!bg) void setWindowMode('main');
    });
  });
}

export const setLastError = (lastError: string) => set({ lastError });

const COUNTDOWN_SEC = 3;

// Lỗi từ Go (Wails trả Error hoặc chuỗi) → chữ hiện cho người dùng, bỏ tiền tố "Error: ".
export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error:\s*/, '');

// Debug (bước 20 F5): from = chạy một vòng từ node này (only: chỉ riêng node đó – 20 F7); step = dừng trước mỗi node (Tiếp / F10).
// stopAt = chạy tới hết node này rồi dừng; nodes = chỉ chạy cụm node này; seedRun = nạp kết quả + biến của lần chạy trước (31c).
export type Debug = { from?: string; only?: boolean; step?: boolean; stopAt?: string; nodes?: string[]; seedRun?: string };

// Chạy kịch bản với giá trị input (Go áp vào bản sao – resolveInputs): kiểm tra trước (lỗi thì ở lại màn chính),
// thu cửa sổ thành mini bar, chạy tới khi xong / dừng, rồi về màn chính. Form Chạy: runForm.ts.
// path: file kịch bản – Go gom lịch sử chạy theo file.
export async function runScript(script: Script, countdown: boolean, values: Record<string, unknown> = {}, preset = '', path = '', debug: Debug = {}) {
  if (state.running || !inWails) return;
  const sc = model.Script.createFrom(debug.from ? { ...script, start: debug.from } : script);
  set({ preset, source: 'user' });
  let confirmDanger = ''; // kịch bản có thao tác nguy hiểm chưa đồng ý → hỏi (dangerConfirm.ts), Go ghi nhớ khi chạy
  try {
    await ValidateScript(sc, values);
    const lacking = await missingForRun(script);
    if (lacking.length && !(await askPerm(lacking.map((x) => x.name)))) return;
    const chk = await DangerCheck(sc, values, path);
    if (chk.ops?.length && !chk.confirmed) {
      if (!(await askDanger(chk.ops))) return;
      confirmDanger = chk.fingerprint;
    }
  } catch (e) {
    set({ lastError: errorText(e), stopReason: '' });
    return;
  }
  await setWindowMode('minibar');
  try {
    await RunScript(sc, values, session.Options.createFrom({ countdown: countdown ? COUNTDOWN_SEC : 0, path, source: 'user', preset, confirmDanger, pins: getPins(), ...debug }));
  } catch (e) {
    set({ lastError: errorText(e) });
  }
  await setWindowMode('main');
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useEngine = () => useSyncExternalStore(subscribe, () => state);

// Thời gian đã chạy tính tới hiện tại (Go chỉ gửi khi có thay đổi).
export const elapsedNow = ({ progress, receivedAt }: EngineState) =>
  progress ? progress.elapsedMs + (progress.paused ? 0 : Date.now() - receivedAt) : 0;

export const fmtElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const STOP_REASON: Record<string, string> = {
  f8: 'Đã dừng bằng F8',
  corner: 'Dừng khẩn cấp: chuột chạm góc màn hình',
};
