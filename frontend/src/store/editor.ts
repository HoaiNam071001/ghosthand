// Lõi store kịch bản đang soạn: state, đăng ký nghe, hoàn tác / làm lại, thay cả kịch bản.
// Dùng chung giữa các màn (MainScreen, OverlayScreen không cùng mount). Các thao tác theo nghiệp vụ nằm ở module bên cạnh
// (nodes, points, multi) và chỉ đổi state qua `setEditor` / `updateScript` ở đây. Lưu / mở file: scriptFile.ts.
import { useSyncExternalStore } from 'react';
import { ScreenBounds } from '../../wailsjs/go/app/App';
import { Point, Rect, Script } from '../types';
import { browserEdges, browserSteps } from '../demo/browserSteps';
import { inWails, setEditingBounds } from '../windowMode';

export type EditorState = {
  script: Script;
  path: string | null; // file kịch bản đang mở, null = chưa lưu lần nào
  dirty: boolean; // có thay đổi chưa lưu xuống file – mọi thay đổi script qua updateScript đều bật cờ này
  selected: string; // id node đang chọn (inspector)
  picked: string[]; // các node chọn cùng lúc trên canvas (Shift + click / kéo khung) – copy, xoá, biến đổi điểm
  notice: string; // thông báo ngắn gần nhất (đã thêm điểm, điểm ngoài vùng…)
  dragA: Point | null; // điểm A (toạ độ màn hình) đã chọn, đang chờ điểm B của kéo thả
  countdown: boolean; // đếm ngược 3 giây trước khi chạy
  multi: string[]; // điểm đang chọn nhiều (bước 30), khoá pointKey(id, index)
  past: Script[]; // hoàn tác (cũ nhất trước)
  future: Script[]; // làm lại
  screen: Rect; // khung màn hình chính (robotgo) – "toàn màn hình" neo theo khung này, khớp mainScreen (anchor.go)
  opened: number; // tăng mỗi lần thay cả kịch bản (replaceScript) – nhật ký chạy của kịch bản cũ bỏ đi (runStore)
};

// Trình duyệt (không có Go): dữ liệu mẫu nối thành chuỗi để xem canvas / overlay.
const browserScript = (): Script => ({
  version: 4, name: 'Kịch bản 1', region: null, loops: 10, maxMinutes: 0,
  steps: browserSteps, start: browserSteps[0].id, edges: browserEdges,
});
// Kịch bản mới bật sẵn thao tác giống người mức vừa (bước 34, khớp model.NewScript).
export const emptyScript = (): Script => ({ version: 4, name: 'Kịch bản 1', region: null, loops: 1, maxMinutes: 0, steps: [], start: '', edges: [], human: 'medium' });

let state: EditorState = {
  // app thật: kịch bản trống cho tới khi scriptFile.ts nạp bản nháp
  script: inWails ? emptyScript() : browserScript(),
  path: null,
  dirty: false,
  selected: inWails ? '' : '3',
  picked: [],
  notice: '',
  dragA: null,
  countdown: true,
  multi: [],
  past: [],
  future: [],
  screen: { x: 0, y: 0, w: window.screen.width, h: window.screen.height }, // trình duyệt: tạm lấy cỡ màn hình
  opened: 0,
};
const listeners = new Set<() => void>();
setEditingBounds(() => state.script.region ?? state.screen); // overlay mở trên màn chứa vùng / màn chính

// Chỉ các module trong store/ gọi trực tiếp; component dùng các hàm nghiệp vụ.
export const setEditor = (patch: Partial<EditorState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getEditor = () => state;
export const useEditor = () => useSyncExternalStore(subscribe, () => state);
export const useScript = () => useEditor().script;

export const selectStep = (id: string) => setEditor({ selected: id });
export const setNotice = (notice: string) => setEditor({ notice });
export const setCountdown = (countdown: boolean) => setEditor({ countdown });

// ---- Hoàn tác / làm lại (bước 30) ----
// Mỗi thay đổi kịch bản lưu bản trước đó; các thay đổi sát nhau (gõ số, giữ phím mũi tên) gộp thành một lần hoàn tác.
const HISTORY_MAX = 100;
const MERGE_MS = 500;
let lastEdit = 0;

export const updateScript = (patch: Partial<Script>) => {
  const now = Date.now();
  const past = now - lastEdit < MERGE_MS && state.past.length ? state.past : [...state.past, state.script].slice(-HISTORY_MAX);
  lastEdit = now;
  setEditor({ script: { ...state.script, ...patch }, dirty: true, past, future: [] });
};

// Đổi kịch bản không tính là sửa (không bật cờ chưa lưu, không vào lịch sử) – vd tự xếp vị trí node lần đầu mở.
export const patchScriptSilently = (patch: Partial<Script>) => setEditor({ script: { ...state.script, ...patch } });

// Sau hoàn tác / làm lại: node đang chọn và điểm chọn nhiều phải còn tồn tại.
const restore = (script: Script, past: Script[], future: Script[], notice: string) => {
  lastEdit = 0;
  const ids = new Set(script.steps.map((s) => s.id));
  setEditor({
    script, past, future, dirty: true, notice, dragA: null,
    selected: ids.has(state.selected) ? state.selected : '',
    picked: state.picked.filter((id) => ids.has(id)),
    multi: state.multi.filter((k) => ids.has(k.split(':')[0])),
  });
};

export function undo() {
  const prev = state.past.at(-1);
  if (!prev) return setNotice('Không còn gì để hoàn tác');
  restore(prev, state.past.slice(0, -1), [state.script, ...state.future], 'Đã hoàn tác');
}

export function redo() {
  const next = state.future[0];
  if (!next) return setNotice('Không còn gì để làm lại');
  restore(next, [...state.past, state.script], state.future.slice(1), 'Đã làm lại');
}

// Cmd/Ctrl+Z hoàn tác, + Shift + Z (hoặc Ctrl+Y) làm lại – mọi màn; trong ô nhập để trình duyệt tự hoàn tác chữ.
window.addEventListener('keydown', (e) => {
  if (!(navigator.platform.startsWith('Mac') ? e.metaKey : e.ctrlKey) || e.altKey) return;
  if ((e.target as HTMLElement).closest?.('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  if (k === 'z') (e.shiftKey ? redo : undo)();
  else if (k === 'y' && !e.shiftKey) redo();
  else return;
  e.preventDefault();
});

// Thay cả kịch bản (mở file, kịch bản mới, khôi phục nháp): bỏ chọn / hoàn tác / điểm A đang chờ của kịch bản cũ.
export function replaceScript(script: Script, path: string | null, dirty: boolean, notice = '') {
  lastEdit = 0;
  setEditor({ script, path, dirty, selected: script.start || script.steps[0]?.id || '', picked: [], dragA: null, notice, multi: [], past: [], future: [], opened: state.opened + 1 });
}

// File đang mở bị ghi từ ngoài app (API / AI): nạp bản trên đĩa, bản đang soạn vào hoàn tác (Ctrl+Z lấy lại).
export function reloadScript(script: Script, notice: string) {
  restore(script, [...state.past, state.script].slice(-HISTORY_MAX), [], notice);
  setEditor({ dirty: false });
}

// Sau khi lưu: đường dẫn + tên mới (Lưu thành đổi tên theo file), giữ nguyên phần còn lại đang soạn.
// stillDirty: có sửa thêm trong lúc hộp thoại lưu đang mở.
export const markSaved = (path: string, name: string, notice: string, stillDirty: boolean) =>
  setEditor({ script: { ...state.script, name }, path, dirty: stillDirty, notice });

if (inWails) ScreenBounds().then((screen) => setEditor({ screen })).catch(() => {});
