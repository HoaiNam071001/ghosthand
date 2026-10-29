// Node và cạnh của flow (bước 20): thêm / sửa / xoá / nhân bản node, nối / cắt cạnh, node bắt đầu, vị trí trên canvas.
// Phép trên đồ thị là hàm thuần ở flow/edit.ts – ở đây chỉ ghép với state, hoàn tác và thông báo.
import { anchorPoint, usesVar } from '../anchor';
import {
  Clip, connect, copyNodes, disconnect, InsertAt, insertNode as insertInto, nextRef, pasteNodes, pruneEdges, removeEdge as dropEdge, removeNode,
} from '../flow/edit';
import { dropMembers } from '../flow/groups';
import { findsImage, flowOrder, portsOf } from '../flow/model';
import { STEP_DEFAULTS } from '../flow/defaults';
import { isWebStep, type WebType } from '../flow/web';
import { placeNode, Positions } from '../flow/layout';
import { toggleNumVar, withNumVar } from '../flow/numvars';
import { makeStep, NumVarField, Point, Script, Step, StepType } from '../types';
import { getEditor, patchScriptSilently, setEditor, setNotice, updateScript } from './editor';
import { boundsOf, centerPoint, refOf, toScreen } from './geometry';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const script = () => getEditor().script;
const setSteps = (steps: Step[]) => updateScript({ steps });

// ---- Chỗ node mới sẽ nối vào ----
// Đặt trước khi mở bảng thêm node / overlay chọn điểm: thả cổng ra ở chỗ trống (kèm vị trí thả), hoặc Ctrl+K khi đang chọn
// node (sau cổng success của nó). null = node mới đứng riêng. Đặt nhiều điểm liên tiếp trên overlay thì node sau nối vào
// node vừa thêm. clearInsertAt khi đóng bảng / overlay.
let insertAt: (InsertAt & { pos?: Point }) | null = null;
export const setInsertAt = (at: (InsertAt & { pos?: Point }) | null) => {
  insertAt = at;
};
export const clearInsertAt = () => setInsertAt(null);
// Mặc định của bảng thêm node khi không thả từ cổng: sau cổng đầu (success / true / next…) của node đang chọn.
export const insertAfterSelected = () => {
  const sel = script().steps.find((s) => s.id === getEditor().selected);
  const port = sel && portsOf(sel)[0];
  setInsertAt(sel && port ? { from: sel.id, port } : null);
};
// Đang chèn vào đâu – dòng ghi trên bảng thêm node.
export const insertTarget = () => insertAt;

// Thêm node vào flow theo insertAt, đặt mã + vị trí, chọn nó và báo. Node sau (đặt điểm liên tiếp) nối vào node này.
export function insertNode(step: Step, notice: (ref: string) => string) {
  const sc = script();
  const node: Step = { ...step, ref: step.ref || nextRef(sc.steps), pos: step.pos ?? insertAt?.pos ?? placeNode(sc.steps, insertAt?.from, portsOf(step)) };
  updateScript(insertInto(sc, node, insertAt));
  const next = portsOf(node)[0]; // node đặt tiếp (điểm liên tiếp trên overlay) nối vào cổng đầu của node này
  if (insertAt) insertAt = next ? { from: node.id, port: next } : null;
  setEditor({ selected: node.id, notice: notice(node.ref) });
}

// Thêm node không cần chọn điểm (chờ, gõ chữ, phím tắt, cuộn tại chuột, mở, chờ ảnh…) – mặc định ở flow/defaults (giống NewStep).
// patch: sửa thêm sau mặc định (vd node Mở bằng Chrome của app).
export function addStep(type: Extract<StepType, 'wait' | 'type' | 'key' | 'scroll' | 'open' | 'waitImage' | 'clickImage' | 'waitPixel' | 'waitScreen' | 'findAll' | 'screenshot' | 'clipboard' | 'http' | 'file' | 'system' | 'window' | 'app' | 'browserTab' | 'browserGo' | 'browserNorm' | 'savePdf' | 'waitUntil' | 'path' | 'elementRead' | 'pageText' | 'readTable' | 'waitDownload' | 'shell' | 'osShortcut' | 'sysInfo' | 'process' | 'inputSource' | 'zip' | 'notify' | 'askAI' | 'mcpTool' | 'power' | 'display' | 'elementAction' | 'readDocument' | 'waitUIEvent' | 'webKey' | WebType>, patch: Partial<Step> = {}) {
  // phần phụ thuộc kịch bản ghép thêm vào bảng mặc định chung (flow/defaults)
  const dynamic: Partial<Step> = type === 'clickImage' ? { imageFrom: nearestFinder() }
    : type === 'waitPixel' ? { points: [centerPoint(script().region)] }
    : type === 'path' ? { points: [-150, 0, 150].map((x, i) => ({ x, y: i === 1 ? -100 : 0, ax: 'center' as const, ay: 'center' as const })) } // 3 điểm neo giữa – kéo marker để sửa
    : {};
  insertNode(makeStep({ id: newId(), type, ...STEP_DEFAULTS[type], ...dynamic, ...patch }), (ref) => `Đã thêm ${ref}`);
  clearInsertAt();
}

// Nguồn mặc định cho click theo ảnh mới: node đang nối vào nếu nó tìm ảnh, không thì node tìm ảnh gần nhất theo thứ tự.
function nearestFinder(): string | undefined {
  const sc = script();
  const from = sc.steps.find((s) => s.id === insertAt?.from);
  if (from && findsImage(from)) return from.id;
  const order = flowOrder(sc);
  const upto = from ? order.indexOf(from.id) : order.length - 1;
  const byId = new Map(sc.steps.map((s) => [s.id, s]));
  return order.slice(0, upto + 1).reverse().find((id) => findsImage(byId.get(id)!));
}

export function updateStep(id: string, patch: Partial<Step>) {
  const steps = script().steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
  // appOp quyết định cổng ra (Ứng dụng kiểm tra: yes / no) → bỏ cạnh từ cổng không còn
  updateScript('appOp' in patch ? { steps, edges: pruneEdges(steps, script().edges) } : { steps });
}

// Trường số lấy từ biến (F5c): bật / tắt (toggleNumVar), sửa biểu thức (withNumVar).
export function setNumVarOn(id: string, field: NumVarField, on: boolean) {
  const s = script().steps.find((x) => x.id === id);
  if (s) setSteps(script().steps.map((x) => (x.id === id ? toggleNumVar(s, field, on) : x)));
}
export function setNumVarExpr(id: string, field: NumVarField, expr: string) {
  setSteps(script().steps.map((x) => (x.id === id ? withNumVar(x, field, expr) : x)));
}

export const toggleStep = (id: string) => {
  const s = script().steps.find((x) => x.id === id);
  if (s) updateStep(id, { enabled: !s.enabled });
};

// Nhân bản: id + mã mới, đặt lệch xuống dưới, chưa nối cạnh nào.
export function duplicateStep(id: string) {
  const sc = script();
  const c = copyNodes(sc, [id]);
  if (!c) return;
  const r = pasteNodes(sc, c, newId, { x: 24, y: 24 });
  updateScript({ steps: r.steps });
  setEditor({ selected: r.ids[0], notice: `Đã nhân bản ${refOf(id)} thành ${refOf(r.ids[0])} (chưa nối)` });
}

const undoKey = () => `${navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl+'}Z để hoàn tác`;

// Xoá các node kèm cạnh vào / ra – một lần hoàn tác (⌘Z / Ctrl+Z).
export function removeSteps(ids: string[]) {
  const sc = script();
  const del = ids.filter((id) => sc.steps.some((s) => s.id === id));
  if (!del.length) return;
  const label = del.length === 1 ? refOf(del[0]) : `${del.length} node`;
  let g = { nodes: sc.steps, edges: sc.edges, start: sc.start };
  for (const id of del) g = removeNode(g, id);
  updateScript({ steps: g.nodes, edges: g.edges, start: g.start, groups: dropMembers(sc.groups, del) });
  const { selected, picked } = getEditor();
  setEditor({ selected: del.includes(selected) ? '' : selected, picked: picked.filter((id) => !del.includes(id)), notice: `Đã xoá ${label} – ${undoKey()}` });
}
export const removeStep = (id: string) => removeSteps([id]);

// Node đang thao tác: nhóm đang chọn, không có thì node trong inspector.
const targetIds = () => {
  const { picked, selected } = getEditor();
  return picked.length ? picked : selected ? [selected] : [];
};

// ---- Copy / paste (Ctrl+C / V) ----
// Bộ nhớ chép ở store (không qua clipboard hệ thống) – dán được sang kịch bản khác đang mở trong app.
// Dán liên tiếp thì mỗi lần lệch thêm một nấc để không chồng lên nhau.
let clip: Clip | null = null;
let pasteCount = 0;

export function copySelected() {
  const c = copyNodes(script(), targetIds());
  if (!c) return setNotice('Chưa chọn node nào để chép');
  clip = c;
  pasteCount = 0;
  setNotice(`Đã chép ${c.steps.length} node`);
}

export function pasteClip() {
  if (!clip) return setNotice('Chưa chép node nào');
  pasteCount++;
  const r = pasteNodes(script(), clip, newId, { x: 40 * pasteCount, y: 40 * pasteCount });
  updateScript({ steps: r.steps, edges: r.edges, start: r.start });
  setEditor({ selected: r.ids[0], picked: r.ids.length > 1 ? r.ids : [], multi: [], notice: `Đã dán ${r.ids.length} node – ${undoKey()}` });
}

// Đổi loại node, bổ sung dữ liệu loại mới cần: điểm (click/double/hold 1, kéo thả 2 – B lệch A 100 px), số click ≥ 1.
// Cạnh của cổng loại mới không có bị bỏ.
export function changeStepType(id: string, type: StepType) {
  const sc = script();
  const s = sc.steps.find((x) => x.id === id);
  if (!s || s.type === type) return;
  const points = s.points.slice(0, type === 'scroll' ? 1 : undefined).map((p) => ({ ...p })); // cuộn: điểm tuỳ chọn, tối đa 1
  const need = type === 'drag' || (type === 'path' && !s.shape) ? 2 : type === 'click' || type === 'double' || type === 'hold' || type === 'waitPixel' || type === 'path' ? 1 : 0;
  if (need >= 1 && points.length === 0) points.push({ x: 0, y: 0 });
  if (need === 2 && points.length === 1) {
    const a = points[0];
    const b = toScreen(a, sc.region, s);
    points.push(usesVar(a) ? { ...a, xVar: `${a.xVar} + 100` } : anchorPoint({ x: b.x + 100, y: b.y }, boundsOf(sc.region, s), a.ax, a.ay));
  }
  const next: Step = {
    ...s,
    type,
    points,
    clicks: Math.max(s.clicks, 1),
    holdMs: type === 'hold' && !s.holdMs ? 1000 : s.holdMs,
    dragMs: (type === 'drag' || type === 'path') && !s.dragMs ? (type === 'path' ? 1500 : 400) : s.dragMs,
    keys: type === 'key' && s.keys.length === 0 ? ['enter'] : s.keys,
    direction: type === 'scroll' ? s.direction ?? 'down' : s.direction,
    amount: type === 'scroll' && !s.amount ? 3 : s.amount,
    target: type === 'open' && !s.target ? 'https://' : s.target,
    threshold: s.threshold ?? 90,
    timeoutMs: s.timeoutMs ?? (type === 'waitPixel' ? 5000 : 10000),
    intervalMs: s.intervalMs ?? (type === 'waitPixel' ? 100 : isWebStep(type) ? 200 : 250),
    selectors: isWebStep(type) && !s.selectors?.length ? ['text='] : s.selectors,
    webClear: type === 'webType' ? s.webClear ?? true : s.webClear,
    imageSource: type === 'clickImage' ? s.imageSource ?? 'node' : s.imageSource,
    color: type === 'waitPixel' ? s.color ?? '#000000' : s.color,
    tolerance: type === 'waitPixel' ? s.tolerance ?? 10 : s.tolerance,
    stableMs: type === 'waitScreen' ? s.stableMs ?? 1000 : s.stableMs,
    diffPct: type === 'waitScreen' ? s.diffPct ?? 1 : s.diffPct,
  };
  const steps = sc.steps.map((x) => (x.id === id ? next : x));
  updateScript({ steps, edges: pruneEdges(steps, sc.edges) });
}

// ---- Cạnh, node bắt đầu, vị trí ----

export function connectPort(from: string, port: string, to: string) {
  const sc = script();
  const edges = connect(sc.edges, from, port, to);
  if (edges !== sc.edges) updateScript({ edges });
}

export const disconnectPort = (from: string, port: string) => updateScript({ edges: disconnect(script().edges, from, port) });
export const removeEdge = (id: string) => updateScript({ edges: dropEdge(script().edges, id) });

export function setStart(id: string) {
  updateScript({ start: id });
  setNotice(`${refOf(id)} là node bắt đầu`);
}

export const moveNode = (id: string, pos: Point) => setSteps(script().steps.map((s) => (s.id === id ? { ...s, pos } : s)));

// Ghi vị trí từ xếp tự động. silent: lần đầu mở kịch bản chưa có vị trí – không tính là sửa.
export function applyLayout(pos: Positions, silent = false) {
  const patch: Partial<Script> = { steps: script().steps.map((s) => (pos[s.id] ? { ...s, pos: pos[s.id] } : s)) };
  if (silent) patchScriptSilently(patch);
  else {
    updateScript(patch);
    setNotice('Đã sắp xếp lại các node');
  }
}
