// Node xử lý chữ (bước 42 G4b): Lọc mẫu, Tách chữ, Làm sạch chữ, Số & ngày – lựa chọn, nhãn cổng, dòng chi tiết thẻ,
// cảnh báo, output. Chạy ở internal/engine/textnodes.go (logic internal/textop); view.ts gọi các hàm ở đây.
import { tr } from '../i18n/lang';
import type { Step, StepType } from '../types';

export type TextType = 'textMatch' | 'textSplit' | 'textClean' | 'textNumber';
export const TEXT_TYPES: TextType[] = ['textMatch', 'textSplit', 'textClean', 'textNumber'];
export const isTextNode = (t: StepType): t is TextType => (TEXT_TYPES as StepType[]).includes(t);

// Khớp model.CaseModes / NumOps / NumStyles ('' = mặc định)
export type CaseMode = '' | 'lower' | 'upper' | 'title';
export const caseModes = (): { id: CaseMode; label: string }[] => [
  { id: '', label: tr('txn.mode.keep') }, { id: 'lower', label: tr('txn.mode.lower') }, { id: 'upper', label: tr('txn.mode.upper') }, { id: 'title', label: tr('txn.mode.title') },
];
export type NumOp = '' | 'format' | 'date';
export const numOps = (): { id: NumOp; label: string }[] => [{ id: '', label: tr('txn.op.num') }, { id: 'format', label: tr('txn.op.format') }, { id: 'date', label: tr('txn.op.date') }];
export type NumStyle = '' | 'en' | 'plain';
export const NUM_STYLES: { id: NumStyle; label: string }[] = [{ id: '', label: '1.234,5' }, { id: 'en', label: '1,234.5' }, { id: 'plain', label: '1234.5' }];

// Nhãn cổng: Lọc mẫu / Số & ngày có cổng fail khi không ra kết quả; Tách / Làm sạch chỉ có Tiếp.
export function textPortLabel(t: TextType, port: string): string {
  if (port !== 'fail') return t === 'textMatch' ? tr('txn.port.match') : t === 'textNumber' ? tr('txn.port.read') : tr('txn.port.next');
  return t === 'textMatch' ? tr('txn.port.noMatch') : tr('txn.port.noRead');
}

const short = (v?: string) => {
  const t = (v ?? '').trim();
  return t.length > 28 ? `${t.slice(0, 27)}…` : t;
};

// Dòng chi tiết thẻ.
export function textDetail(s: Step): string {
  switch (s.type) {
    case 'textMatch': return `/${short(s.pattern) || '?'}/${s.matchAll ? tr('txn.d.all') : ''}`;
    case 'textSplit': return tr('txn.d.split', { by: s.separator ? `“${s.separator}”` : tr('txn.d.line') });
    case 'textClean': {
      const parts = [
        s.replaceFrom && tr('txn.d.replace', { v: short(s.replaceFrom) }), s.stripAccents && tr('txn.d.accents'),
        s.caseMode && caseModes().find((c) => c.id === s.caseMode)?.label.toLowerCase(), s.trim && tr('txn.d.trim'),
      ].filter(Boolean);
      return parts.join(' · ') || tr('txn.d.none');
    }
    case 'textNumber':
      if (s.numOp === 'date') return tr('txn.d.date', { l: s.dateLayout || 'dd/MM/yyyy' });
      if (s.numOp === 'format') return tr('txn.d.format', { style: NUM_STYLES.find((x) => x.id === (s.numStyle ?? ''))?.label ?? '', n: s.decimals ?? 0 });
      return tr('txn.d.num', { v: short(s.value) || '—' });
    default: return '';
  }
}

// Thiếu dữ liệu (chạy sẽ báo lỗi) – undefined = đủ. Regex chỉ kiểm ở Go (RE2 khác regex JS).
export function textWarning(s: Step): string | undefined {
  if (!s.value?.trim() && !(s.type === 'textNumber' && s.numOp === 'date')) return tr('txn.w.noText');
  if (s.type === 'textMatch' && !s.pattern) return tr('txn.w.noPattern');
  return undefined;
}

export type TextOutput = { key: string; desc: string };
export function textOutputs(s: Step): TextOutput[] {
  switch (s.type) {
    case 'textMatch': return [{ key: 'text', desc: tr('txn.o.match') }, { key: 'items', desc: s.matchAll ? tr('txn.o.itemsAll') : tr('txn.o.itemsOne') },
      { key: 'count', desc: tr('txn.o.count') }, { key: 'groups', desc: tr('txn.o.groups') }];
    case 'textSplit': return [{ key: 'items', desc: tr('txn.o.parts') }, { key: 'count', desc: tr('txn.o.partCount') }];
    case 'textClean': return [{ key: 'text', desc: tr('txn.o.clean') }];
    case 'textNumber':
      if (s.numOp === 'date') return [{ key: 'text', desc: tr('txn.o.dateText') }, { key: 'timestamp', desc: tr('txn.o.ts') }];
      return [{ key: s.numOp === 'format' ? 'text' : 'value', desc: s.numOp === 'format' ? tr('txn.o.fmtText') : tr('txn.o.numValue') },
        { key: s.numOp === 'format' ? 'value' : 'text', desc: s.numOp === 'format' ? tr('txn.o.origNum') : tr('txn.o.numText') }];
    default: return [];
  }
}
