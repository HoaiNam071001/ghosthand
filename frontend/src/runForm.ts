// Bấm Chạy / F8 (bước 21b): kịch bản có input → mở form Chạy (RunDialog) điền giá trị, trừ khi đã bật
// "Lần sau chạy luôn". Giá trị lần trước + bộ giá trị (preset) lưu trên máy theo từng kịch bản (internal/store/inputmemory.go).
import { useSyncExternalStore } from 'react';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { GetInputMemory, SaveInputMemory, ValidateScript } from '../wailsjs/go/app/App';
import { model, store } from '../wailsjs/go/models';
import { getEditor } from './store';
import { Debug, errorText, runScript } from './engineStore';
import { parseValue } from './scriptInputs';
import { inWails, setWindowMode } from './windowMode';
import { InputValue, Script } from './types';

export type Values = Record<string, InputValue>;
export type Memory = { last?: Values; lastPreset?: string; presets?: { name: string; values: Values }[]; autoRun?: boolean };

type FormState = {
  open: boolean;
  memory: Memory; // của kịch bản đang mở
  memoryId: string; // memory đang hiện thuộc kịch bản nào
  error: string; // lỗi kiểm tra khi bấm Chạy trong form
};

let state: FormState = { open: false, memory: {}, memoryId: '', error: '' };
const listeners = new Set<() => void>();
const set = (patch: Partial<FormState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const useRunForm = () =>
  useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, () => state);

// Kịch bản đã lưu nhớ theo đường dẫn file; chưa lưu thì theo tên.
const idOf = () => {
  const { path, script } = getEditor();
  return path ?? `unsaved:${script.name}`;
};

// Chỉ giữ giá trị của input còn trong kịch bản, đúng kiểu (Go báo lỗi nếu gửi key lạ).
export function cleanValues(sc: Script, values: Values | undefined): Values {
  const out: Values = {};
  for (const i of sc.inputs ?? []) {
    const v = parseValue(i.type, values?.[i.key]);
    if (v !== undefined) out[i.key] = v;
  }
  return out;
}

// Nạp giá trị đã nhớ của kịch bản đang mở (tab Input hiện "đang chạy luôn").
export async function loadMemory(): Promise<Memory> {
  const id = idOf();
  if (!inWails) return {};
  if (state.memoryId === id) return state.memory;
  const m = ((await GetInputMemory(id).catch(() => ({}))) ?? {}) as Memory;
  set({ memory: m, memoryId: id });
  return m;
}

async function saveMemory(m: Memory) {
  set({ memory: m, memoryId: idOf() });
  if (inWails) await SaveInputMemory(idOf(), store.InputMemory.createFrom(m)).catch(() => {});
}

let busy = false; // từ lúc bấm Chạy tới khi chạy xong – F8 (phím toàn cục) tới trễ không chạy lần nữa
let debug: Debug = {}; // cách chạy của lần bấm gần nhất – giữ qua form Chạy

// Nút Chạy / F8 khi chưa chạy. ask: luôn mở form kể cả khi đã bật "chạy luôn" (Shift + bấm Chạy).
// dbg: nút debug – chạy từ node đang chọn / chạy từng node.
export async function startRun(ask = false, dbg: Debug = {}) {
  if (busy || state.open) return;
  debug = dbg;
  const { script, countdown } = getEditor();
  if (!script.inputs?.length) return run(script, countdown, {}, '');
  const m = await loadMemory();
  if (m.autoRun && !ask) return run(script, countdown, cleanValues(script, m.last), m.lastPreset ?? '');
  if (location.hash !== '') await setWindowMode('main'); // F8 lúc đang ở overlay: form nằm ở màn chính
  set({ open: true, error: '' });
}

async function run(script: Script, countdown: boolean, values: Values, preset: string) {
  busy = true;
  try {
    await runScript(script, countdown, values, preset, getEditor().path ?? '', debug);
  } finally {
    busy = false;
  }
}

export const closeRunForm = () => set({ open: false, error: '' });

// Bấm Chạy trong form: kiểm tra (lỗi → hiện trong form, không đóng), nhớ giá trị, rồi chạy.
export async function submitRun(raw: Values, remember: boolean, preset: string) {
  const { script, countdown } = getEditor();
  const values = cleanValues(script, raw);
  if (inWails) {
    try {
      await ValidateScript(model.Script.createFrom(script), values);
    } catch (e) {
      return set({ error: errorText(e) });
    }
  }
  await saveMemory({ ...state.memory, last: values, lastPreset: preset, autoRun: remember });
  closeRunForm();
  await run(script, countdown, values, preset);
}

export async function savePreset(name: string, raw: Values) {
  const values = cleanValues(getEditor().script, raw);
  const presets = (state.memory.presets ?? []).filter((p) => p.name !== name);
  await saveMemory({ ...state.memory, presets: [...presets, { name, values }] });
}

export const deletePreset = (name: string) =>
  saveMemory({ ...state.memory, presets: state.memory.presets?.filter((p) => p.name !== name) });

// Tắt "chạy luôn" – lần sau bấm Chạy lại hỏi.
export const stopAutoRun = () => saveMemory({ ...state.memory, autoRun: false });

if (inWails) EventsOn('hotkey:f8start', () => startRun());
