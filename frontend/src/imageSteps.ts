// Chờ ảnh / click theo ảnh / chờ pixel (bước 25) – phía giao diện: khoanh ảnh mẫu trên overlay, thử tìm trên màn hình,
// lấy màu pixel, quyền chụp màn hình (macOS). Engine + so khớp ở Go (internal/engine, internal/vision, imageapi.go).
import { useSyncExternalStore } from 'react';
import { CaptureTemplate, FindImage, PickElementAt, PixelColorAt, RequestScreenCapture, ScreenCaptureAllowed, TestNode } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { element, model } from '../wailsjs/go/models';
import { addStep, getEditor, pickScreenPoint, selectStep, setNotice, toScreen, updateCond, updateStep } from './store';
import { CondAt, condOf } from './flow/cond';
import { errorText } from './engineStore';
import { inWails, openOverlay, setWindowMode } from './windowMode';
import { Rect } from './types';
import { usesVar } from './anchor';

// fromRun: chỗ giống nhất của lần chạy hết giờ không thấy (engine:failed), không phải từ nút Thử tìm.
// label: chữ trên khung overlay thay cho "khớp N%" (node web).
export type FindResult = { found: boolean; score: number; x: number; y: number; w: number; h: number; area: Rect; ms: number; read?: string[]; fromRun?: boolean; label?: string; colorDiff?: number; count?: number; all?: Rect[] }; // colorDiff: % lệch màu khi node kiểm tra màu; count / all: Tìm tất cả – số chỗ + khung từng chỗ

// Kết quả "Thử node" (internal/engine/nodetest.go) – node Nếu / Switch / Switch theo màn hình
export type CondPart = { path: number[]; case?: string; kind: string; ok: boolean; known: boolean; detail: string; hit?: Rect };
export type NodeTestResult = { port: string; known: boolean; parts: CondPart[]; value?: string; ms: number };

export type ElementSuggestion = element.Suggestion; // gợi ý cách tìm phần tử vừa chọn (43 A4)

type ImageState = {
  suggestions: Record<string, ElementSuggestion[]>; // theo id node – sau "Chọn trên màn"
  nodeTests: Record<string, NodeTestResult>; // theo id node
  allowed: boolean | null; // quyền chụp màn hình (null = chưa kiểm tra)
  finds: Record<string, FindResult>; // kết quả "Thử tìm" theo id bước – overlay vẽ khung
  busy: string; // id bước đang thử tìm / lấy màu
  error: string;
};
let state: ImageState = { suggestions: {}, nodeTests: {}, allowed: null, finds: {}, busy: '', error: '' };
const listeners = new Set<() => void>();
const set = (p: Partial<ImageState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};
export const useImageState = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => state);

export async function checkCapture() {
  if (!inWails) return set({ allowed: true });
  set({ allowed: await ScreenCaptureAllowed().catch(() => true) });
}
export async function requestCapture() {
  if (inWails) set({ allowed: await RequestScreenCapture().catch(() => false) });
}

// ---- Khoanh ảnh mẫu ----
let captureTarget: string | null = null; // bước nhận ảnh mẫu; null = tạo bước Chờ ảnh mới
let captureCond: CondAt | null = null; // ảnh mẫu cho điều kiện của node Nếu / case; null = của chính node
export const captureTargetStep = () => captureTarget;
// Khoanh cho node Chụp màn hình (bước 35 N1) / Chờ màn hình (42 G1): lấy vùng (shotRect), không chụp ảnh mẫu.
export const capturesRect = () => {
  const t = getEditor().script.steps.find((s) => s.id === captureTarget)?.type;
  return !captureCond && (t === 'screenshot' || t === 'waitScreen');
};

export function startCapture(stepId: string | null, at: CondAt | null = null) {
  captureTarget = stepId;
  captureCond = at;
  return openOverlay('capture');
}

// Bảng thêm bước: Chờ ảnh → thêm bước rồi khoanh ảnh luôn.
export function addImageStep(type: 'waitImage' | 'clickImage' | 'waitPixel') {
  addStep(type);
  if (type === 'waitImage') startCapture(getEditor().selected);
}

// Bảng thêm bước: Chờ chữ / Click theo chữ = bước chờ ảnh / click theo ảnh (tự tìm) tìm theo chữ – không khoanh ảnh.
export function addTextStep(type: 'waitImage' | 'clickImage') {
  addStep(type);
  updateStep(getEditor().selected, { findBy: 'text', findText: '', ...(type === 'clickImage' ? { imageSource: 'search' as const } : {}) });
}

// Bảng thêm bước: Chờ phần tử / Click theo phần tử (37 E3) = chờ ảnh / click theo ảnh (tự tìm) tìm theo phần tử
// accessibility – dòng cách tìm để trống cho người dùng gõ hoặc Chọn phần tử trên màn.
export function addElementStep(type: 'waitImage' | 'clickImage') {
  addStep(type);
  updateStep(getEditor().selected, { findBy: 'element', selectors: ['text='], ...(type === 'clickImage' ? { imageSource: 'search' as const } : {}) });
}

// "Dùng ảnh này" trên overlay: chụp vùng r (toạ độ màn hình thật) – Go ẩn cửa sổ lúc chụp – ghi vào bước, về màn chính.
export async function applyCapture(r: Rect): Promise<string | null> {
  if (capturesRect()) {
    updateStep(captureTarget!, { shotArea: 'rect', shotRect: r });
    setNotice(`Đã chọn vùng chụp ${r.w} × ${r.h}`);
    captureTarget = null;
    await setWindowMode('main');
    return null;
  }
  if (!inWails) return 'Chỉ chụp được trong app';
  try {
    const shot = await CaptureTemplate(model.Rect.createFrom(r));
    if (captureCond && captureTarget && getEditor().script.steps.some((s) => s.id === captureTarget)) {
      updateCond(captureTarget, captureCond, (c) => ({ ...c, template: shot.png, templateScale: shot.scale }));
      dropTest(captureTarget);
      setNotice(`Đã lưu ảnh mẫu ${shot.w} × ${shot.h} cho điều kiện`);
      captureTarget = captureCond = null;
      await setWindowMode('main');
      return null;
    }
    const target = captureTarget && getEditor().script.steps.some((s) => s.id === captureTarget) ? captureTarget : null;
    if (!target) addStep('waitImage');
    const id = target ?? getEditor().selected;
    updateStep(id, { template: shot.png, templateScale: shot.scale });
    const { [id]: _, ...finds } = state.finds;
    set({ finds });
    setNotice(`Đã lưu ảnh mẫu ${shot.w} × ${shot.h}`);
    captureTarget = null;
    await setWindowMode('main');
    return null;
  } catch (e) {
    return errorText(e);
  }
}

// ---- Thử tìm / lấy màu ----
export async function testFind(stepId: string) {
  if (!inWails) return;
  set({ busy: stepId, error: '' });
  try {
    const r = await FindImage(model.Script.createFrom(getEditor().script), stepId);
    set({ finds: { ...state.finds, [stepId]: r as FindResult }, busy: '' });
  } catch (e) {
    set({ busy: '', error: errorText(e) });
  }
}

// "Chọn phần tử trên màn" (37 E3): bấm vào phần tử trên overlay → Go đọc cây accessibility, lấy phần tử dưới điểm và
// sinh cách tìm (đã tìm lại đúng) → ghi vào node; khung phần tử vẽ trên overlay như Thử tìm.
export function pickElement(stepId: string) {
  if (!inWails) return;
  set({ error: '' });
  void pickScreenPoint(async (p) => {
    set({ busy: stepId });
    try {
      const r = await PickElementAt(model.Script.createFrom(getEditor().script), stepId, p.x, p.y);
      updateStep(stepId, { selectors: r.selectors, occurrence: r.occurrence > 1 ? r.occurrence : undefined });
      const b = r.box;
      set({ busy: '', suggestions: { ...state.suggestions, [stepId]: r.suggestions ?? [] }, finds: { ...state.finds, [stepId]: { found: true, score: 100, x: b.x, y: b.y, w: b.w, h: b.h, area: b, ms: 0, label: r.role } } });
      setNotice(`Đã chọn ${r.role}${r.name ? ` “${r.name}”` : ''} – cách tìm: ${r.selectors[0]}`);
    } catch (e) {
      set({ busy: '', error: errorText(e) });
    }
  });
}

// Khung trên overlay của nơi khác (Thử tìm node web – webSteps.ts); null = bỏ khung.
export function showFind(id: string, r: FindResult | null) {
  const { [id]: _, ...finds } = state.finds;
  set({ finds: r ? { ...finds, [id]: r } : finds });
}

const dropTest = (id: string) => {
  const { [id]: _, ...nodeTests } = state.nodeTests;
  const { [id]: __, ...finds } = state.finds;
  set({ nodeTests, finds });
};

// "Thử node": xét node Nếu / Switch trên màn hình lúc này; chỗ thấy (ưu tiên điều kiện đúng) vẽ khung trên overlay như Thử tìm.
export async function testNode(stepId: string) {
  if (!inWails) return;
  set({ busy: stepId, error: '' });
  try {
    const r = (await TestNode(model.Script.createFrom(getEditor().script), stepId)) as NodeTestResult;
    const boxes = r.parts.filter((p) => p.hit && p.hit.w > 0);
    const hit = (boxes.find((p) => p.ok) ?? boxes[0])?.hit;
    const finds = { ...state.finds };
    if (hit) finds[stepId] = { found: !!boxes.find((p) => p.ok), score: 100, ...hit, area: hit, ms: r.ms };
    else delete finds[stepId];
    set({ nodeTests: { ...state.nodeTests, [stepId]: r }, finds, busy: '' });
  } catch (e) {
    set({ busy: '', error: errorText(e) });
  }
}

// "Lấy màu" cho điều kiện màu pixel.
export async function pickCondColor(stepId: string, at: CondAt) {
  const { script } = getEditor();
  const s = script.steps.find((x) => x.id === stepId);
  const p0 = s && condOf(s, at)?.points?.[0];
  if (!p0 || !inWails) return;
  set({ busy: stepId, error: '' });
  try {
    const p = toScreen(p0, script.region);
    const color = await PixelColorAt(p.x, p.y);
    updateCond(stepId, at, (c) => ({ ...c, color }));
    setNotice(`Màu tại X ${p.x} Y ${p.y}: ${color}`);
    set({ busy: '' });
  } catch (e) {
    set({ busy: '', error: errorText(e) });
  }
}

export async function pickColor(stepId: string) {
  const { script } = getEditor();
  const s = script.steps.find((x) => x.id === stepId);
  if (!s?.points[0] || usesVar(s.points[0]) || !inWails) return; // điểm từ biến: chỉ biết lúc chạy
  set({ busy: stepId, error: '' });
  try {
    const p = toScreen(s.points[0], script.region, s);
    const color = await PixelColorAt(p.x, p.y);
    updateStep(stepId, { color });
    setNotice(`Màu tại X ${p.x} Y ${p.y}: ${color}`);
    set({ busy: '' });
  } catch (e) {
    set({ busy: '', error: errorText(e) });
  }
}

// Ảnh mẫu → URL hiển thị trong <img>
export const templateUrl = (png?: string) => (png ? `data:image/png;base64,${png}` : '');

// Lần chạy dừng vì lỗi: chọn bước lỗi để người dùng thấy ngay; chờ ảnh hết giờ thì nhớ chỗ giống nhất (xem trên màn hình).
if (inWails) {
  EventsOn('engine:failed', (f: { stepId: string; miss?: FindResult }) => {
    selectStep(f.stepId);
    if (f.miss) set({ finds: { ...state.finds, [f.stepId]: { ...f.miss, found: false, fromRun: true } } });
  });
}
