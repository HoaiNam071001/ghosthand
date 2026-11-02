// Nối / bỏ nối dữ liệu giữa node (bước 60): kéo output sang ô của node khác. Phép trên node ở flow/dataLinks.ts –
// ở đây ghép với state, hoàn tác và thông báo.
import { dataSlots, linkBlock, linkSlot, unlinkSlot } from '../flow/dataLinks';
import { getEditor, setNotice, updateScript } from './editor';

const find = (id: string) => getEditor().script.steps.find((s) => s.id === id);

// Nối output key của node fromId vào ô slot của node toId. Trả lý do khi không nối được (node chạy trước…).
export function linkData(fromId: string, key: string, toId: string, slot: string): string | null {
  const sc = getEditor().script;
  const from = find(fromId), to = find(toId);
  if (!from || !to) return 'không thấy node';
  const why = linkBlock(sc, fromId, toId);
  if (why) {
    setNotice(`Không nối được ${from.ref}.${key} → ${to.ref}: ${why}`);
    return why;
  }
  const before = dataSlots(to).find((s) => s.name === slot);
  if (!before) return 'ô không nhận biến';
  const next = linkSlot(to, slot, from.ref, key);
  updateScript({ steps: sc.steps.map((s) => (s.id === toId ? next : s)) });
  const had = before.num && before.text.trim() ? ` (thay ${before.text.trim()})` : '';
  setNotice(`Đã nối ${from.ref}.${key} → ${to.ref} · ${before.label}${had} – Ctrl+Z để hoàn tác`);
  return null;
}

// Bỏ biến trỏ node ref (key rỗng = mọi key) khỏi ô slot của node stepId.
export function unlinkData(stepId: string, slot: string, ref: string, key = '') {
  const sc = getEditor().script;
  const s = find(stepId);
  if (!s) return;
  const label = dataSlots(s).find((x) => x.name === slot)?.label ?? slot;
  updateScript({ steps: sc.steps.map((x) => (x.id === stepId ? unlinkSlot(x, slot, ref, key) : x)) });
  setNotice(`Đã bỏ nối ${ref}${key ? `.${key}` : ''} khỏi ${s.ref} · ${label}`);
}
