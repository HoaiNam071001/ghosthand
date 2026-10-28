import { model } from '../wailsjs/go/models';
import type { AdvancedFields, TextFields } from './stepAdvanced';
import { TEXT_TYPES, type TextType } from './flow/textNodes';
import type { ReadFrom, ScrollMode } from './flow/web';

// Neo của một trục (anchor.ts, khớp internal/script/anchor.go): bỏ trống = start (cách cạnh trái / trên).
export type Anchor = 'start' | 'center' | 'end' | 'ratio';
// Toạ độ màn hình / cửa sổ.
export type Point = { x: number; y: number };
// Điểm lưu trong bước: neo theo cạnh vùng từng trục (khớp Point trong model.go). xVar / yVar (F5b): toạ độ màn hình từ biến
// ("{{n2.output.x}} + 20") – có thì bỏ qua x / y + neo (anchor.ts usesVar).
export type StepPoint = Point & { ax?: Anchor; ay?: Anchor; xVar?: string; yVar?: string };
export type Rect = { x: number; y: number; w: number; h: number };
// Một dòng bảng query / header / form của node HTTP (khớp KV trong internal/model/http.go).
export type KV = { key: string; value: string };
// Cách so ảnh mẫu – khớp model.MatchModes: '' so độ sáng (xám) | edge so viền (chịu đổi theme / màu nền) – bước 40.
export type MatchMode = '' | 'edge';
// Node thất bại (không thấy ảnh / chữ / màu, lỗi): thử lại thêm count lần, nghỉ delayMs; hết lượt → cổng fail. Khớp Retry trong model.go.
export type Retry = { count?: number; delayMs?: number };
// Node hay "thất bại" theo nghĩa người dùng hiểu – mới hiện phần Khi thất bại (thử lại)
export const CAN_FAIL: StepType[] = ['waitImage', 'clickImage', 'waitPixel', 'waitScreen', 'findAll', 'screenshot', 'clipboard', 'http', 'file', 'system', 'window', 'app', 'browserTab', 'browserGo', 'browserNorm', 'savePdf', 'waitUntil', 'webWait', 'webClick', 'webType', 'webRead', 'webScroll', 'webKey', 'elementRead', 'pageText', 'readTable', 'waitDownload', 'shell', 'osShortcut', 'elementAction', 'readDocument', 'waitUIEvent', 'open'];

// ---- Flow (bước 20, flow.go) ----
// Cạnh: node from đi ra cổng port thì chạy node to. Mỗi cổng tối đa một cạnh. Khớp Edge trong model.go.
export interface Edge { id: string; from: string; port: string; to: string }
export type StepStatus = 'success' | 'fail' | 'skipped' | 'cancelled';
export type ErrorCode = 'not_found' | 'timeout' | 'permission' | 'invalid_input' | 'cancelled' | 'end' | 'browser' | 'http_status' | 'network' | 'exit_code' | 'window_mismatch' | 'internal';
// Kết quả một lần chạy node (event engine:node) – khớp StepResult trong flow.go.
export interface StepResult {
  nodeId: string;
  ref: string;
  status: StepStatus;
  port?: string;
  output?: Record<string, unknown>;
  error?: { code: ErrorCode; message: string };
  logs?: { atMs: number; level: 'info' | 'warn' | 'error'; msg: string }[];
  attempts: number;
  loop: number; // vòng thứ mấy, từ 1
  shot?: string; // ảnh lúc thất bại (lịch sử chạy – RunShot)
  changes?: Record<string, unknown>; // phần tử mới / mất / đổi giá trị so với sau node trước (AI chạy shots: each – 43 A3)
  startedAt: string;
  durationMs: number;
}
const edgeMatchesGo: Same<keyof Edge, keyof Fields<model.Edge>> = true;
const resultMatchesGo: Same<keyof StepResult, keyof Fields<model.StepResult>> = true;
void edgeMatchesGo, resultMatchesGo;

export type ActionType = 'click' | 'double' | 'hold' | 'drag' | 'wait' | 'type' | 'key' | 'scroll' | 'open' | 'waitImage' | 'clickImage' | 'waitPixel' | 'waitScreen' | 'findAll' | 'screenshot' | 'clipboard' | 'http' | 'file' | 'system' | 'window' | 'app' | 'browserTab' | 'browserGo' | 'browserNorm' | 'savePdf' | 'waitUntil' | 'path'
  | 'webWait' | 'webClick' | 'webType' | 'webRead' | 'webScroll' | 'webKey' | 'elementRead' | 'pageText' | 'readTable' | 'waitDownload' | 'shell' | 'osShortcut' | 'sysInfo' | 'process' | 'inputSource' | 'zip' | 'notify' | 'askAI' | 'power' | 'display' | 'elementAction' | 'readDocument' | 'waitUIEvent';
// Node điều khiển (bước 20 F3, internal/engine/nodes.go): chỉ chọn cổng ra, inspector riêng (components/flow/nodes/ControlFields)
export type ControlType = 'if' | 'switch' | 'switchScreen' | 'counter' | 'forEach' | 'end' | 'setVar' | 'calc' | TextType;
export type StepType = ActionType | ControlType;
export const CONTROL_TYPES: ControlType[] = ['if', 'switch', 'switchScreen', 'counter', 'forEach', 'end', 'setVar', 'calc', ...TEXT_TYPES];
export const isControl = (t: StepType): t is ControlType => (CONTROL_TYPES as StepType[]).includes(t);

// Điều kiện của node Nếu / case của Switch theo màn hình – khớp Cond trong model.go (internal/engine/cond.go).
export type CondKind = 'image' | 'text' | 'element' | 'pixel' | 'value' | 'all' | 'any';
export type CondOp = 'eq' | 'ne' | 'contains' | 'gt' | 'lt' | 'empty';
export interface Cond {
  kind: CondKind;
  not?: boolean; // đảo kết quả
  template?: string; templateScale?: number; threshold?: number; matchMode?: MatchMode; colorTol?: number; searchArea?: string; // image (như Chờ ảnh)
  findText?: string; textExact?: boolean; textAccent?: boolean; occurrence?: number; // text, nhận {{biến}}
  selectors?: string[]; elementApp?: string; // element (bước 37): như Chờ ảnh tìm theo phần tử, nhận {{biến}}
  points?: StepPoint[]; color?: string; tolerance?: number; // pixel: points[0]
  left?: string; op?: CondOp; right?: string; // value: so 2 vế, nhận {{biến}}
  conds?: Cond[]; // all (và) / any (hoặc)
}
// Nhánh của switch / switchScreen – cổng ra "case:" + key. Khớp Case trong model.go.
export type CaseOp = 'eq' | 'contains' | 'regex';
export interface Case {
  key: string;
  label?: string; // tên trên cổng, bỏ trống = key
  op?: CaseOp; // switch
  match?: string; // switch, nhận {{biến}}
  cond?: Cond; // switchScreen
}
export type ScrollDirection = 'up' | 'down' | 'left' | 'right';
export type MouseButton = 'left' | 'right' | 'center';
export type Modifier = 'cmd' | 'ctrl' | 'alt' | 'shift';
// chord: nhấn giữ cùng lúc (Ctrl+C+T) · sequence: giữ phím kèm, gõ lần lượt từng phím chính
export type KeyMode = 'chord' | 'sequence';
// Cách nhập chữ (model.TypeModes): '' tự chọn | keys gõ từng phím | paste dán qua clipboard (không bị bộ gõ tiếng Việt làm méo)
export type TypeMode = '' | 'keys' | 'paste';

// Mức thao tác giống người – khớp HumanLevels (model.go).
export type HumanLevel = 'off' | 'low' | 'medium' | 'high';

// Node của flow (bước 20) – khớp Step trong model.go.
export interface Step extends AdvancedFields, TextFields {
  id: string;
  type: StepType;
  ref: string; // mã ngắn n1, n2… (duy nhất) – biến {{n2.output.x}}
  name?: string; // tên trên thẻ, bỏ trống = tên theo loại
  pos?: Point; // vị trí thẻ trên canvas
  breakpoint?: boolean; // debug: chạy từ app thì tạm dừng trước node này
  points: StepPoint[]; // drag: points[0] -> points[1]; B lệch so với A (dragRelative) không dùng neo
  button: MouseButton;
  clicks: number;
  clickInterval: number; // ms
  holdMs: number;
  dragMs: number;
  dragFromPrev: boolean; // drag: bắt đầu từ chỗ chuột dừng ở bước chuột trước (bỏ qua points[0])
  dragRelative: boolean; // drag: points[1] là độ lệch (dx, dy) so với điểm bắt đầu
  coordSpace?: "region" | "absolute"; // node có điểm: absolute = toạ độ màn hình thật (không cộng gốc vùng)
  text: string; // type / webType: chuỗi cần gõ
  typeMode?: TypeMode; // type / webType: bỏ trống = tự chọn (Windows + không giống người: dán)
  keys: string[]; // key: phím chính theo tên robotgo (enter, tab, a, f5…)
  keyMode: KeyMode; // key: chỉ khác nhau khi có ≥ 2 phím chính
  modifiers: Modifier[]; // key: tổ hợp, vd ['cmd'] + 'v'
  delayAfter: number; // ms
  jitterMs: number; // ngẫu nhiên ± ms cho delayAfter và clickInterval
  jitterPx: number; // ngẫu nhiên ± px cho mỗi lần di chuột tới điểm
  enabled: boolean;
  direction?: ScrollDirection; // scroll
  amount?: number; // scroll: số nấc
  target?: string; // open: URL / đường dẫn / tên app, nhận {{biến}}
  app?: string; // open: mở bằng app này, '' = mặc định của máy
  webBrowser?: boolean; // open: mở bằng Chrome của app (profile riêng) – node web điều khiển được; bỏ qua app
  // web qua DOM (bước 25d, internal/engine/webstep.go) – cách tìm ở flow/web.ts
  selectors?: string[]; // node web: mỗi dòng một cách tìm (text= / aria= / role= / label= / css= / xpath=), dòng đầu ưu tiên; nhận {{biến}}
  tab?: string; // tab có URL / tiêu đề chứa chuỗi này, bỏ trống = tab đang hiện; nhận {{biến}}
  webGone?: boolean; // webWait: chờ phần tử mất
  webClear?: boolean; // webType: xoá chữ cũ trước khi gõ
  webEnter?: boolean; // webType: Enter sau khi gõ
  skipFocusCheck?: boolean; // webType: không kiểm tra ô nhận focus sau khi click (ô tuỳ biến)
  webScope?: 'dialog'; // node web: chỉ tìm trong hộp thoại đang mở trên cùng (bỏ trống = cả trang)
  webBackground?: boolean; // webWait / webClick / webType / webScroll: chạy nền qua CDP, không đụng chuột / phím thật (flow/web.ts canBackground)
  readFrom?: ReadFrom; // webRead: bỏ trống = chữ hiển thị
  attr?: string; // webRead readFrom attr: tên thuộc tính
  scrollMode?: ScrollMode; // webScroll: bỏ trống = tới phần tử
  scrollIn?: string[]; // webScroll until: khung cuộn (như selectors), trống = giữa trang; nhận {{biến}}
  // chờ ảnh / click theo ảnh / chờ pixel (bước 25, internal/engine/imagestep.go)
  template?: string; // ảnh mẫu PNG base64
  templateScale?: number; // px ảnh mẫu / 1 px logic lúc chụp (Retina 2, Windows 125 % 1,25)
  threshold?: number; // % khớp tối thiểu
  matchMode?: MatchMode; // bỏ trống = so độ sáng
  colorTol?: number; // % lệch màu tối đa so với ảnh mẫu, 0 / trống = không kiểm tra màu (bước 40)
  timeoutMs?: number; // chờ tối đa
  intervalMs?: number; // kiểm tra mỗi
  searchArea?: 'screen'; // bỏ trống = vùng của kịch bản
  imageSource?: 'node' | 'search'; // clickImage: chỗ node imageFrom thấy / tự tìm
  imageFrom?: string; // clickImage imageSource node / screenshot shotArea node: id node lấy chỗ thấy
  dx?: number; // clickImage / webClick: lệch so với tâm ảnh / phần tử
  dy?: number;
  findBy?: 'text' | 'element'; // waitImage / clickImage tự tìm: bỏ trống = ảnh mẫu, text = tìm chữ (ocr.go), element = phần tử (bước 37, dùng selectors)
  elementApp?: string; // findBy element: tên app / bundle id, trống = app có cửa sổ trên cùng; nhận {{biến}}
  findText?: string; // chữ cần tìm, nhận {{biến}}
  textExact?: boolean; // cả dòng đúng chuỗi (mặc định: chứa chuỗi)
  textAccent?: boolean; // so đúng dấu (mặc định bỏ qua dấu)
  uiEvent?: string; // waitUIEvent: UiEvent (trống = newWindow); cửa sổ lọc bằng winApp / winTitle, phần tử bằng elementApp / selectors
  shortcutName?: string; // osShortcut: tên Shortcut trong app Phím tắt (macOS); input lấy từ text; nhận {{biến}}
  shellLang?: string; // shell: ShellLang (trống = shell của máy)
  script?: string; // shell: nội dung lệnh nguyên văn – KHÔNG nhận {{biến}}
  shellEnv?: KV[]; // shell: biến môi trường cho lệnh (giá trị nhận {{biến}})
  elementAct?: string; // elementAction: ElementAct (trống = press); setValue lấy text
  minCount?: number; // findAll: cần thấy ít nhất chừng này chỗ (0 / trống = 1)
  maxCount?: number; // findAll: thấy nhiều hơn → chờ tiếp / Thất bại (0 / trống = không giới hạn)
  occurrence?: number; // chỗ thứ mấy theo thứ tự đọc, 0 = chỗ đầu (node web: chỗ bấm được đầu tiên)
  // Đọc phần tử (bước 37 E4, engine/elementread.go): findBy text = tìm nhãn bằng OCR
  readNear?: 'right' | 'below'; // OCR chữ bên phải / bên dưới nhãn; bỏ trống = đọc chính phần tử
  readSpan?: number; // khoảng đọc từ mép nhãn (px), 0 = 300
  readPattern?: string; // lọc theo regex (nhóm () đầu nếu có); không khớp = chờ đọc lại
  readNumber?: boolean; // chuẩn hoá số: 1.234.000₫ → 1234000
  readChange?: boolean; pageAll?: boolean; selectionOnly?: boolean; // chờ giá trị đổi so với lần đọc đầu | pageText: gồm cả phần ngoài khung nhìn | readDocument: chỉ phần đang chọn
  retry?: Retry; // thất bại thì thử lại; hết lượt → cổng fail (internal/engine/flowrun.go execNode)
  numVars?: NumVar[]; // trường số lấy từ biến (F5c) – giá trị lúc chạy thay cho trường đó
  human?: HumanLevel; // mức giống người riêng của node – trống = theo kịch bản (bước 34)
  color?: string; // waitPixel: #RRGGBB
  tolerance?: number; // waitPixel: sai số mỗi kênh màu
  // node điều khiển (bước 20 F3)
  cond?: Cond; // if
  cases?: Case[]; // switch / switchScreen
  value?: string; // switch: giá trị cần xét; setVar: giá trị gán / cộng; forEach: danh sách; calc: biểu thức; xử lý chữ: chữ vào
  max?: number; // counter: số lần đi cổng next tối đa
  listFrom?: '' | 'file'; // forEach: '' = chữ / biến (mảng JSON hoặc mỗi dòng một phần tử) | file = CSV / xlsx filePath
  endStatus?: 'success' | 'fail'; // end
  message?: string; // end: lời nhắn / lời báo lỗi
  varName?: string; // setVar
  varOp?: 'set' | 'add'; // setVar
}

// Kiểm tra lúc type-check: Step phải khớp struct Go (model.go) – thiếu/thừa/sai kiểu field là tsc báo lỗi.
// bỏ hàm (convertValues của class sinh từ Go) ở mọi tầng – Step có điều kiện / case lồng nhau
type Fields<T> = { [K in keyof T as T[K] extends Function ? never : K]: DeepFields<T[K]> };
type DeepFields<T> = T extends (infer U)[] ? DeepFields<U>[] : T extends object ? Fields<T> : T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const stepMatchesGo: [Step extends Fields<model.Step> ? true : false, Same<keyof Step, keyof Fields<model.Step>>] = [true, true];
void stepMatchesGo;
const condMatchesGo: [Same<keyof Cond, keyof Fields<model.Cond>>, Same<keyof Case, keyof Fields<model.Case>>] = [true, true];
void condMatchesGo;

// Kịch bản – khớp struct Script trong model.go. Toạ độ điểm tương đối theo region (null = toàn màn hình).
export interface Script {
  version: number; // định dạng file (storage.go) – Go ghi khi lưu
  name: string;
  region: Rect | null; // toạ độ màn hình thật (robotgo)
  loops: number; // 0 = vô hạn
  maxMinutes: number; // 0 = không giới hạn
  steps: Step[]; // node của flow – thứ tự mảng không quyết định thứ tự chạy
  start: string; // id node bắt đầu
  edges: Edge[];
  anchorMode?: AnchorMode; // điểm mới đặt neo theo: bỏ trống = góc gần nhất, start = luôn trên trái
  inputs?: ScriptInput[]; // giá trị hỏi khi bấm Chạy (bước 21b, internal/script/inputs.go)
  human?: HumanLevel; // thao tác giống người (bước 34, internal/humanize): trống / off = tắt
  keepAwake?: boolean; // giữ máy + màn hình thức trong lúc chạy (bước 43 S3)
  meta?: ScriptMeta; // nguồn gốc – AI tạo qua MCP (bước 31)
  groups?: Group[]; // khung nhóm node – chỉ UI (bước 39, flow/groups.ts)
}
export interface Group {
  id: string;
  name: string;
  members: string[]; // id node – một node thuộc nhiều nhất một nhóm
  collapsed?: boolean; // thu thành một thẻ
  color?: string;
  from?: string; // nguồn khi nhúng từ kịch bản khác (G2)
}
export type AnchorMode = 'start';
export interface ScriptMeta {
  createdBy?: 'ai';
}
const scriptMatchesGo: [Same<keyof Script, keyof Fields<model.Script>>, Same<keyof ScriptMeta, keyof Fields<model.ScriptMeta>>, Same<keyof Group, keyof Fields<model.Group>>] = [true, true, true];
void scriptMatchesGo;

// ---- Input của kịch bản (bước 21b) – khớp ScriptInput trong internal/model/inputs.go ----
export type InputType = 'text' | 'multiline' | 'number' | 'ms' | 'bool' | 'select';
export type InputValue = string | number | boolean;
// Trường ghim được (pinFields trong internal/script/inputvalue.go): số → input number / ms, enabled → bool.
export type PinField = 'clicks' | 'clickInterval' | 'holdMs' | 'dragMs' | 'delayAfter' | 'jitterMs' | 'jitterPx' | 'amount' | 'timeoutMs' | 'threshold' | 'enabled';
export interface InputTarget { stepId: string; field: PinField }
// Trường số lấy từ biến (F5c, khớp NumVar trong model.go): expr là số / biến cộng trừ, vd "{{n2.output.count}} + 1".
export type NumVarField = Exclude<PinField, 'enabled'>;
export interface NumVar { field: NumVarField; expr: string }
const numVarMatchesGo: Same<keyof NumVar, keyof Fields<model.NumVar>> = true;
void numVarMatchesGo;
export interface ScriptInput {
  key: string; // chữ không dấu, số, _ – dùng trong {{key}}
  label: string;
  type: InputType;
  default?: InputValue; // trống = không có mặc định
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[]; // select
  hint?: string; // gợi ý dưới ô trong form Chạy
  targets?: InputTarget[]; // trường được ghim
}
const inputMatchesGo: Same<keyof ScriptInput, keyof Fields<model.ScriptInput>> = true;
void inputMatchesGo;

// Tạo bước với giá trị trống, ghi đè bằng p (dùng cho dữ liệu mẫu / demo).
export const makeStep = (p: Partial<Step> & Pick<Step, 'id' | 'type'>): Step => ({
  ref: '', points: [], button: 'left', clicks: 1, clickInterval: 0, holdMs: 0, dragMs: 0, dragFromPrev: false, dragRelative: false,
  text: '', keys: [], keyMode: 'chord', modifiers: [], delayAfter: 300, jitterMs: 0, jitterPx: 0, enabled: true, ...p,
});

// Tên hiện cho một bước cụ thể: Chờ ảnh / Click theo ảnh đang tìm theo chữ / phần tử thì là "Chờ chữ" / "Click theo chữ"…
export function stepLabel(s: Step): string {
  if (s.findBy && (s.type === 'waitImage' || (s.type === 'clickImage' && s.imageSource === 'search'))) {
    const what = s.findBy === 'text' ? 'chữ' : 'phần tử';
    return s.type === 'waitImage' ? `Chờ ${what}` : `Click theo ${what}`;
  }
  return STEP_LABEL[s.type];
}

export const STEP_LABEL: Record<StepType, string> = {
  click: 'Click',
  double: 'Double click',
  hold: 'Giữ chuột',
  drag: 'Kéo thả',
  wait: 'Chờ',
  type: 'Gõ chữ',
  key: 'Phím tắt',
  scroll: 'Cuộn',
  open: 'Mở URL / app',
  waitImage: 'Chờ ảnh',
  clickImage: 'Click theo ảnh',
  waitPixel: 'Chờ màu pixel',
  waitScreen: 'Chờ màn hình',
  waitDownload: 'Chờ tải xong',
  shell: 'Chạy lệnh',
  osShortcut: 'Shortcuts hệ điều hành',
  sysInfo: 'Thông tin máy',
  process: 'Tiến trình',
  inputSource: 'Bộ gõ',
  zip: 'Nén / giải nén',
  notify: 'Thông báo hệ thống',
  askAI: 'Hỏi AI',
  power: 'Nguồn',
  display: 'Màn hình / âm thanh',
  elementAction: 'Thao tác phần tử',
  readDocument: 'Đọc tài liệu',
  waitUIEvent: 'Chờ sự kiện giao diện',
  findAll: 'Tìm tất cả',
  screenshot: 'Chụp màn hình',
  clipboard: 'Clipboard',
  http: 'HTTP',
  file: 'Tệp / thư mục',
  system: 'Hệ thống',
  window: 'Cửa sổ',
  app: 'Ứng dụng',
  browserTab: 'Tab trình duyệt',
  browserGo: 'Đi tới URL',
  browserNorm: 'Chuẩn hoá trình duyệt',
  savePdf: 'Lưu trang ra PDF',
  waitUntil: 'Chờ đến giờ',
  path: 'Vẽ đường',
  webWait: 'Chờ phần tử web',
  webClick: 'Click phần tử web',
  webType: 'Gõ vào ô web',
  webRead: 'Đọc phần tử web',
  elementRead: 'Đọc phần tử',
  pageText: 'Đọc chữ trang',
  readTable: 'Đọc bảng',
  webScroll: 'Cuộn trang web',
  webKey: 'Phím trên trang web',
  if: 'Nếu',
  switch: 'Switch theo giá trị',
  switchScreen: 'Switch theo màn hình',
  counter: 'Đếm',
  forEach: 'Lặp qua danh sách',
  end: 'Kết thúc',
  setVar: 'Đặt biến',
  calc: 'Tính toán',
  textMatch: 'Lọc mẫu',
  textSplit: 'Tách chữ',
  textClean: 'Làm sạch chữ',
  textNumber: 'Số & ngày',
};

export const fmtMs = (ms: number) => (ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`);
// Biểu thức biến của trường số (F5c) – undefined = trường dùng số cố định.
export const numVarOf = (s: Pick<Step, 'numVars'>, field: NumVarField) => s.numVars?.find((v) => v.field === field)?.expr;
