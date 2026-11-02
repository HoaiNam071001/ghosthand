// Dữ liệu hiển thị của khối VÀO / RA trên thẻ node + dây dữ liệu trên canvas (bước 60 V3). Logic thuần.
import type { Step, StepResult } from '../types';
import { dataSlots, usedKeys } from './dataLinks';
import { valueText } from './runOutputs';
import { outputsOf } from './view';

// Một hàng VÀO (id = tên ô, khớp StepResult.input) hoặc RA (id = khoá output, có thể sâu: item.text).
export type DataPinView = {
  id: string;
  label: string;
  value: string; // giá trị lần chạy; chưa chạy: VÀO = nguồn (n4.item.text) / chữ cố định, RA = trống
  ran?: boolean; // value là giá trị thật của lần chạy
  linked?: boolean; // VÀO: ô đang đọc biến node; RA: có node khác đang dùng
  src?: string; // VÀO: ref node nguồn (biến đầu tiên)
  tip?: string; // chữ đầy đủ cho tooltip
};
export type DataPins = { ins: DataPinView[]; outs: DataPinView[] };
// Dây dữ liệu: output key của node from → ô slot của node to.
export type DataEdgeView = { id: string; from: string; key: string; to: string; slot: string };

const MAX_IN = 6, MAX_OUT = 4, MAX_SUB = 4;
const short = (v: string, n = 28) => (v.length > n ? `${v.slice(0, n - 1)}…` : v);
const HIDE = new Set(['startedAt', 'durationMs']); // output chung – chỉ hiện khi có node dùng

// used: usedKeys(steps) tính sẵn khi gọi cho nhiều node (tránh quét cả kịch bản cho từng node)
export function dataPins(s: Step, steps: Step[], last?: StepResult, used = usedKeys(steps).get(s.ref) ?? new Set<string>()): DataPins {
  const slots = dataSlots(s);
  const ins = [...slots.filter((x) => x.refs.length), ...slots.filter((x) => !x.refs.length)].slice(0, MAX_IN).map((sl): DataPinView => {
    const run = last?.input?.[sl.name];
    const linked = sl.refs.length > 0;
    const value = run !== undefined ? valueText(run)
      : linked ? sl.refs.map((r) => `${r.ref}.${r.key}`).join(' + ') : sl.text.trim() || 'trống';
    return { id: sl.name, label: sl.label, value: short(value), ran: run !== undefined, linked, src: sl.refs[0]?.ref, tip: sl.text || undefined };
  });
  const out = last?.output;
  const keys: { key: string; desc: string }[] = [];
  const add = (key: string, desc: string) => { if (!keys.some((k) => k.key === key)) keys.push({ key, desc }); };
  for (const k of used) add(k, k);
  for (const f of outputsOf(s)) {
    if (HIDE.has(f.key) && !used.has(f.key)) continue;
    const v = out?.[f.key];
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.keys(v).slice(0, MAX_SUB).forEach((sub) => add(`${f.key}.${sub}`, `${f.desc} · ${sub}`));
    else add(f.key, f.desc);
  }
  const outs = keys.slice(0, Math.max(MAX_OUT, used.size)).map(({ key, desc }): DataPinView => {
    const v = pick(out, key);
    return { id: key, label: key, value: v !== undefined ? short(valueText(v)) : '', ran: v !== undefined, linked: used.has(key), tip: desc }; // mô tả ở tooltip – thẻ gọn
  });
  return { ins, outs };
}

// Giá trị output theo khoá sâu (item.text)
export function pick(out: Record<string, unknown> | undefined, key: string): unknown {
  let v: unknown = out;
  for (const p of key.split('.')) v = v && typeof v === 'object' ? (v as Record<string, unknown>)[p] : undefined;
  return v;
}

// Mọi dây dữ liệu của kịch bản: mỗi biến node trong mỗi ô là một dây (nguồn theo ref).
export function dataEdges(steps: Step[]): DataEdgeView[] {
  const byRef = new Map(steps.map((s) => [s.ref, s.id]));
  const out: DataEdgeView[] = [];
  for (const s of steps) {
    for (const sl of dataSlots(s)) {
      for (const r of sl.refs) {
        const from = byRef.get(r.ref);
        if (!from || from === s.id) continue;
        const id = `d:${from}:${r.key}>${s.id}:${sl.name}`;
        if (!out.some((e) => e.id === id)) out.push({ id, from, key: r.key, to: s.id, slot: sl.name });
      }
    }
  }
  return out;
}
