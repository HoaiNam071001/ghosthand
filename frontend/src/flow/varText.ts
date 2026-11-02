// Ô chữ nhận {{biến}} của node (logic thuần – scriptInputs, flow/dataLinks dùng chung).
import { usesVar } from '../anchor';
import type { Cond, KV, Step } from '../types';

// Ô chữ nhận {{biến}} của node – khớp VarFields (internal/script/varfields.go): gõ chữ, mở, chữ cần tìm, điều kiện / case / giá trị của
// node điều khiển, toạ độ điểm dùng biến (F5b), trường số lấy từ biến (F5c). mapVarText trả node mới với từng ô qua f
// (không sửa node cũ).
export function mapVarText(s: Step, f: (t: string) => string): Step {
  const out = POINT_TYPES.includes(s.type) && s.points.some(usesVar)
    ? mapFieldText({ ...s, points: s.points.map((p, i) => (usesVar(p) && !(i === 0 && s.type === 'drag' && s.dragFromPrev) // A "từ điểm trước" không dùng
      ? { ...p, xVar: f(p.xVar ?? ''), yVar: f(p.yVar ?? '') } : p)) }, f)
    : mapFieldText(s, f);
  return out.numVars?.length ? { ...out, numVars: out.numVars.map((v) => ({ ...v, expr: f(v.expr) })) } : out;
}
// Loại node có điểm nhận toạ độ từ biến – khớp hasPoints (varfields.go).
const POINT_TYPES: Step['type'][] = ['click', 'double', 'hold', 'drag', 'scroll', 'waitPixel', 'path'];

function mapFieldText(step: Step, f: (t: string) => string): Step {
  // cửa sổ đích của công tắc chỉ-thao-tác-trong-cửa-sổ (khớp VarFields Go)
  const s: Step = step.onlyInWindow ? { ...step, winApp: step.winApp && f(step.winApp), winTitle: step.winTitle && f(step.winTitle) } : step;
  const cond = (c: Cond): Cond =>
    c.kind === 'text' ? { ...c, findText: f(c.findText ?? '') }
      : c.kind === 'element' ? { ...c, selectors: c.selectors?.map(f), elementApp: c.elementApp && f(c.elementApp) }
      : c.kind === 'value' ? { ...c, left: f(c.left ?? ''), right: f(c.right ?? '') }
      : c.kind === 'all' || c.kind === 'any' ? { ...c, conds: (c.conds ?? []).map(cond) } : c;
  switch (s.type) {
    case 'type': return { ...s, text: f(s.text) };
    case 'open': return { ...s, target: f(s.target ?? '') };
    case 'waitUntil': return { ...s, at: f(s.at ?? '') };
    case 'file': return s.fileOp === 'emptyTrash' ? s : {
      ...s, filePath: f(s.filePath ?? ''),
      ...(s.fileOp === 'row' ? { cells: s.cells?.map(f), sheet: s.sheet && f(s.sheet) } : {}),
      ...(s.fileOp === 'trash' ? { filePattern: f(s.filePattern ?? '') } : {}),
      ...(!s.fileOp ? { text: f(s.text) } : {}),
    };
    case 'http': {
      const kv = (rows?: KV[]) => rows?.map((r) => ({ ...r, value: f(r.value) }));
      return { ...s, url: f(s.url ?? ''), query: kv(s.query), headers: kv(s.headers), form: s.bodyType === 'form' ? kv(s.form) : s.form,
        body: s.bodyType === 'json' || s.bodyType === 'text' ? f(s.body ?? '') : s.body };
    }
    case 'app': return { ...s, appName: s.appName && f(s.appName) };
    case 'browserGo': return { ...s, tab: s.tab && f(s.tab), url: s.url && f(s.url) };
    case 'savePdf': return { ...s, tab: s.tab && f(s.tab), filePath: s.filePath && f(s.filePath) };
    case 'browserNorm': return { ...s, tab: s.tab && f(s.tab) };
    case 'browserTab': return { ...s, tab: s.tab && f(s.tab), ...(s.tabOp === 'new' ? { url: s.url && f(s.url) } : {}) };
    case 'window': return { ...s, winApp: s.winApp && f(s.winApp), winTitle: s.winTitle && f(s.winTitle) };
    case 'clipboard': return s.clipOp === 'write' ? { ...s, text: f(s.text) } : s.clipOp === 'image' ? { ...s, filePath: f(s.filePath ?? '') } : s;
    case 'screenshot': return { ...s, saveDir: s.saveDir && f(s.saveDir), fileName: s.fileName && f(s.fileName) };
    case 'waitImage': case 'clickImage': case 'findAll': return s.findBy === 'text' || s.findBy === 'ai' ? { ...s, findText: f(s.findText ?? '') }
      : s.findBy === 'element' ? { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp) } : s;
    case 'readDocument':
    case 'pageText': return { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp) };
    case 'elementAction': return { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp), text: f(s.text) };
    case 'waitUIEvent': return { ...s, winApp: s.winApp && f(s.winApp), winTitle: s.winTitle && f(s.winTitle), selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp) };
    case 'display': return { ...s, displayValue: s.displayValue && f(s.displayValue) };
    case 'mcpTool': return { ...s, mcpArgs: s.mcpArgs && f(s.mcpArgs) };
    case 'askAI': return { ...s, aiBaseUrl: s.aiBaseUrl && f(s.aiBaseUrl), aiModel: s.aiModel && f(s.aiModel), aiKey: s.aiKey && f(s.aiKey), prompt: s.prompt && f(s.prompt), aiFallback: s.aiFallback && f(s.aiFallback), filePath: s.filePath && f(s.filePath) };
    case 'notify': return { ...s, notifyTitle: s.notifyTitle && f(s.notifyTitle), text: f(s.text) };
    case 'zip': return { ...s, filePath: s.filePath && f(s.filePath), filePattern: s.filePattern && f(s.filePattern), zipTo: s.zipTo && f(s.zipTo) };
    case 'inputSource': return { ...s, inputLayout: s.inputLayout && f(s.inputLayout), inputHotkey: s.inputHotkey && f(s.inputHotkey) };
    case 'process': return { ...s, procName: s.procName && f(s.procName) };
    case 'sysInfo': return { ...s, filePath: s.filePath && f(s.filePath) };
    case 'osShortcut': return { ...s, shortcutName: s.shortcutName && f(s.shortcutName), text: f(s.text) };
    case 'shell': return { ...s, filePath: s.filePath && f(s.filePath), shellEnv: s.shellEnv?.map((kv) => ({ ...kv, value: f(kv.value) })) }; // script không nhận biến
    case 'waitDownload': return { ...s, filePath: s.filePath && f(s.filePath), filePattern: s.filePattern && f(s.filePattern) };
    case 'readTable': return { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp), filePath: s.filePath && f(s.filePath) };
    case 'elementRead': return s.findBy === 'text' ? { ...s, findText: f(s.findText ?? '') }
      : { ...s, selectors: s.selectors?.map(f), elementApp: s.elementApp && f(s.elementApp) };
    case 'webWait': case 'webClick': case 'webRead': return { ...s, selectors: s.selectors?.map(f), tab: s.tab && f(s.tab) };
    case 'webType': return { ...s, selectors: s.selectors?.map(f), tab: s.tab && f(s.tab), text: f(s.text) };
    case 'webKey': return { ...s, tab: s.tab && f(s.tab) };
    case 'webScroll': return { ...s, selectors: s.selectors?.map(f), tab: s.tab && f(s.tab),
      scrollIn: s.scrollMode === 'until' ? s.scrollIn?.map(f) : s.scrollIn };
    case 'if': return s.cond ? { ...s, cond: cond(s.cond) } : s;
    case 'switch': return { ...s, value: f(s.value ?? ''), cases: s.cases?.map((c) => ({ ...c, match: f(c.match ?? '') })) };
    case 'switchScreen': return { ...s, cases: s.cases?.map((c) => (c.cond ? { ...c, cond: cond(c.cond) } : c)) };
    case 'end': return { ...s, message: f(s.message ?? '') };
    case 'setVar': case 'calc': case 'textSplit': case 'textNumber': return { ...s, value: f(s.value ?? '') };
    case 'textMatch': return { ...s, value: f(s.value ?? ''), pattern: s.pattern && f(s.pattern) };
    case 'textClean': return { ...s, value: f(s.value ?? ''), replaceFrom: s.replaceFrom && f(s.replaceFrom), replaceTo: s.replaceTo && f(s.replaceTo) };
    case 'forEach': return s.listFrom === 'file' ? { ...s, filePath: f(s.filePath ?? ''), sheet: s.sheet && f(s.sheet) } : { ...s, value: f(s.value ?? '') };
    default: return s;
  }
}
