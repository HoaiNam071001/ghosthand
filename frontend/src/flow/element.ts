import { fmtMs, type Step } from '../types';
import { parseSelector, selectorLines } from './web';
import { tr } from '../i18n/lang';

// Phần tử màn hình qua Accessibility (bước 37, internal/engine/elementstep.go): chữ hiển thị cho node Chờ / Click theo
// phần tử và điều kiện "thấy phần tử".

// Cách tìm đầu tiên (+ "+n" nếu còn dòng dự phòng); chưa có → "(chưa nhập)".
export function firstSelector(selectors?: string[]): string {
  const lines = (selectors ?? []).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return tr('el.unset');
  return `“${lines[0]}”${lines.length > 1 ? ` +${lines.length - 1}` : ''}`;
}

// Dòng chi tiết node: phần tử “role=button[name=Mua]” · Google Chrome (chỗ thứ 2) · tối đa 10 s
export function fmtElement(s: Step): string {
  if (!s.selectors?.some((l) => l.trim())) return tr('el.noSelector');
  const nth = (s.occurrence ?? 0) > 1 ? ` ${tr('el.nth', { n: s.occurrence ?? 0 })}` : '';
  return `${tr('el.element')} ${firstSelector(s.selectors)}${nth} · ${s.elementApp?.trim() || tr('el.topApp')} · ${tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) })}`;
}

// Dòng chi tiết node Đọc phần tử (+ E4: đọc cạnh nhãn, lọc): nhãn “Giá” (OCR) → bên phải · số · chờ đổi · tối đa 10 s
export function fmtElementRead(s: Step): string {
  const near = s.readNear ? ` → ${s.readNear === 'below' ? tr('el.below') : tr('el.right')}` : '';
  const filter = [s.readPattern ? tr('el.filter') : '', s.readNumber ? tr('el.number') : '', s.readChange ? tr('el.waitChange') : ''].filter(Boolean).map((t) => ` · ${t}`).join('');
  if (s.findBy !== 'text') return fmtElement(s).replace(' · ', `${near}${filter} · `);
  if (!s.findText?.trim()) return tr('el.noLabel');
  const nth = (s.occurrence ?? 0) > 1 ? ` ${tr('el.nth', { n: s.occurrence ?? 0 })}` : '';
  return `${tr('el.label', { t: s.findText })}${nth} (OCR)${near}${filter} · ${tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) })}`;
}

// Dòng chi tiết node Đọc chữ trang: cả cửa sổ Google Chrome · gồm phần ngoài khung nhìn · tối đa 10 s
export function fmtPageText(s: Step): string {
  const app = s.elementApp?.trim() || tr('el.topApp');
  const scope = s.selectors?.some((l) => l.trim()) ? tr('el.inSel', { sel: firstSelector(s.selectors), app }) : tr('el.wholeWin', { app });
  return `${scope}${s.pageAll ? ' · ' + tr('el.offscreen') : ''} · ${tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) })}`;
}

// Dòng chi tiết node Đọc tài liệu: phần đang chọn trong TextEdit · tối đa 10 s
export function fmtReadDocument(s: Step): string {
  const app = s.elementApp?.trim() || tr('el.topApp');
  const where = s.selectors?.some((l) => l.trim()) ? `${firstSelector(s.selectors)} · ${app}` : tr('el.editorOf', { app });
  return `${s.selectionOnly ? tr('el.selectionIn') + ' ' : ''}${where} · ${tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) })}`;
}

// Dòng chi tiết node Đọc bảng: bảng đầu tiên của Google Chrome → ghi ra don-hang.csv · tối đa 10 s
export function fmtReadTable(s: Step): string {
  const app = s.elementApp?.trim() || tr('el.topApp');
  const nth = (s.occurrence ?? 0) > 1 ? tr('el.tableN', { n: s.occurrence ?? 0 }) : tr('el.tableFirst');
  const scope = s.selectors?.some((l) => l.trim()) ? tr('el.tableIn', { sel: firstSelector(s.selectors), app }) : tr('el.tableOf', { nth, app });
  const file = s.filePath?.trim() ? ` → ${tr('el.write', { f: s.filePath.trim().split(/[\\/]/).pop() ?? '' })}` : '';
  return `${scope}${file} · ${tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) })}`;
}

// Dòng cách tìm không dùng được cho phần tử màn hình (css / xpath chỉ có ở node web) – khớp CheckSelector (element/find.go).
// Dòng có {{biến}} chỉ biết lúc chạy. '' = ổn.
export function elementSelectorError(selectors?: string[]): string {
  for (const line of selectorLines(selectors)) {
    if (line.includes('{{')) continue;
    const sel = parseSelector(line);
    if (sel && sel.by !== 'text' && sel.by !== 'aria' && sel.by !== 'role') return tr('el.badBy', { line: line.trim(), by: sel.by });
  }
  return '';
}

// Mẫu lọc của Đọc phần tử không đọc được (báo ngay dưới ô). Go dùng RE2: cú pháp JS chỉ gần đúng – (?i) JS không có nên
// bỏ trước khi thử; lỗi thật Go báo khi chạy (script/element.go). '' = ổn.
export function patternError(pattern?: string): string {
  if (!pattern) return '';
  try {
    new RegExp(pattern.replace(/^\(\?[imsU]+\)/, ''));
    return '';
  } catch {
    return 'Mẫu lọc sai cú pháp (thiếu ngoặc, ký tự đặc biệt chưa có \\ đứng trước…)';
  }
}
