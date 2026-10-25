// Inspector node xử lý chữ (bước 42 G4b): Lọc mẫu, Tách chữ, Làm sạch chữ, Số & ngày – ô chữ vào chung, trường riêng
// từng loại, nút Chạy thử (Go PreviewText – cùng regex RE2 như lúc chạy). Chỉ hiển thị – nối store ở stepform/ControlSection.
import NumInput, { fieldBox } from '../../NumInput';
import Segmented from '../../Segmented';
import VarTextInput from '../../inputs/VarTextInput';
import { errText, Field, hint, SwitchField } from '../../stepform/shared';
import { CASE_MODES, NUM_OPS, NUM_STYLES, type TextType } from '../../../flow/textNodes';
import type { CondCtx } from './CondEditor';
import TextPreviewButton from './TextPreviewButton';

const textBox = `${fieldBox} w-full text-ink outline-none`;

const INPUT_HELP: Record<TextType, string> = {
  textMatch: 'Chữ cần lọc – thường là biến, vd chữ node Đọc phần tử đọc được',
  textSplit: 'Chữ cần tách – vd “Táo, Cam, Xoài” hoặc mỗi dòng một mục',
  textClean: 'Chữ cần làm sạch – thường là biến',
  textNumber: 'Chữ chứa số / ngày – vd “Giá: 1.234.000 đ”, “21/10/2026 14:30”',
};

export default function TextNodeFields({ ctx, type }: { ctx: CondCtx; type: TextType }) {
  const { step: s, set, vars, tools } = ctx;
  const date = type === 'textNumber' && s.numOp === 'date';
  return (
    <div className="flex flex-col gap-3">
      <Field label="Chữ vào" group help={INPUT_HELP[type]}>
        <VarTextInput {...vars} rows={2} value={s.value ?? ''} onChange={(value) => set({ value })} placeholder={date ? 'trống = bây giờ' : '{{n2.output.text}}'} />
        {!s.value?.trim() && !date && <span className={errText}>Chưa có chữ – chạy sẽ báo lỗi</span>}
      </Field>
      {type === 'textMatch' && <MatchForm ctx={ctx} />}
      {type === 'textSplit' && (
        <Field label="Tách theo" group help="Trống = mỗi dòng một phần · \n = xuống dòng · \t = tab. Mỗi phần tự cắt khoảng trắng, bỏ phần trống">
          <input value={s.separator ?? ''} onChange={(e) => set({ separator: e.target.value || undefined })} placeholder="trống = mỗi dòng"
            className={`${textBox} font-mono text-[13px]`} />
        </Field>
      )}
      {type === 'textClean' && <CleanForm ctx={ctx} />}
      {type === 'textNumber' && <NumberForm ctx={ctx} />}
      {tools?.previewText && <TextPreviewButton step={s} run={tools.previewText} />}
    </div>
  );
}

function MatchForm({ ctx: { step: s, set, vars } }: { ctx: CondCtx }) {
  return <>
    <Field label="Mẫu (regex)" group help="Có nhóm () thì lấy phần trong nhóm đầu. (?i) ở đầu = không phân biệt hoa thường">
      <VarTextInput {...vars} rows={1} compact value={s.pattern ?? ''} onChange={(v) => set({ pattern: v || undefined })} placeholder={'Mã đơn: (\\w+)'} />
      {!s.pattern && <span className={errText}>Chưa nhập mẫu</span>}
    </Field>
    <SwitchField label="Lấy mọi chỗ khớp" on={!!s.matchAll} onChange={(on) => set({ matchAll: on || undefined })}
      help="Bật: items = mọi chỗ khớp (nối vào Lặp qua danh sách). Tắt: chỉ chỗ đầu" />
    <span className={hint}>
      Hay dùng: <span className="font-mono text-ink">\d+</span> số · <span className="font-mono text-ink">[\w.]+@[\w.]+</span> email ·
      <span className="font-mono text-ink"> 0\d{'{9}'}</span> số điện thoại. Không khớp → cổng <b className="text-ink">Không khớp</b>.
    </span>
  </>;
}

function CleanForm({ ctx: { step: s, set, vars } }: { ctx: CondCtx }) {
  return <>
    <>
      <Field label="Thay" group>
        <VarTextInput {...vars} rows={1} compact value={s.replaceFrom ?? ''} onChange={(v) => set({ replaceFrom: v || undefined })} placeholder="chữ cần thay" />
      </Field>
      <Field label="Bằng" group help={s.replaceRegex ? '$1 = phần trong nhóm () thứ nhất' : 'Trống = xoá chữ cần thay'}>
        <VarTextInput {...vars} rows={1} compact value={s.replaceTo ?? ''} onChange={(v) => set({ replaceTo: v || undefined })} placeholder="trống = xoá" />
      </Field>
    </>
    {s.replaceFrom && <SwitchField label="Chữ cần thay là regex" on={!!s.replaceRegex} onChange={(on) => set({ replaceRegex: on || undefined })} />}
    <SwitchField label="Bỏ dấu tiếng Việt" on={!!s.stripAccents} onChange={(on) => set({ stripAccents: on || undefined })} help="Đà Nẵng → Da Nang" />
    <Field label="Hoa / thường" group>
      <Segmented value={s.caseMode ?? ''} onChange={(v) => set({ caseMode: v || undefined })} full label="Hoa / thường" options={CASE_MODES} />
    </Field>
    <SwitchField label="Gọn khoảng trắng" on={!!s.trim} onChange={(on) => set({ trim: on || undefined })}
      help="Cắt khoảng trắng hai đầu từng dòng, gộp khoảng trắng liền nhau, bỏ dòng trống" />
    <span className={hint}>Làm lần lượt: thay → bỏ dấu → hoa / thường → gọn khoảng trắng.</span>
  </>;
}

function NumberForm({ ctx: { step: s, set } }: { ctx: CondCtx }) {
  return <>
    <Field label="Việc" group>
      <Segmented value={s.numOp ?? ''} onChange={(v) => set({ numOp: v || undefined })} full label="Việc" options={NUM_OPS} />
    </Field>
    {s.numOp === 'format' && (
      <>
        <Field label="Kiểu viết" group>
          <Segmented value={s.numStyle ?? ''} onChange={(v) => set({ numStyle: v || undefined })} full label="Kiểu viết" options={NUM_STYLES} />
        </Field>
        <Field label="Số lẻ" help="Số chữ số sau dấu thập phân (làm tròn)">
          <NumInput value={s.decimals ?? 0} onChange={(d) => set({ decimals: Math.min(d, 10) || undefined })} />
        </Field>
      </>
    )}
    {s.numOp === 'date' && (
      <Field label="Mẫu ngày" group help="dd ngày · MM tháng · yyyy năm · HH giờ · mm phút · ss giây (d, M, H: không thêm số 0)">
        <input value={s.dateLayout ?? ''} onChange={(e) => set({ dateLayout: e.target.value || undefined })} placeholder="dd/MM/yyyy"
          className={`${textBox} font-mono text-[13px]`} />
      </Field>
    )}
    <span className={hint}>
      {s.numOp === 'date' ? 'Đọc dd/mm/yyyy, yyyy-mm-dd, kèm giờ HH:mm – ở đâu trong chữ cũng được. '
        : <>Đọc số kiểu <span className="font-mono text-ink">1.234.000 đ</span>, <span className="font-mono text-ink">$1,234.56</span> – dấu chấm theo sau đúng 3 chữ số là ngăn nghìn. </>}
      Không đọc được → cổng <b className="text-ink">Không đọc được</b>.
    </span>
  </>;
}
