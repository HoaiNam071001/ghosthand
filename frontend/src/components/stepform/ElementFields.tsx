// Phần tử màn hình qua Accessibility (bước 37): Tìm theo: Phần tử của Chờ / Click (E3) và của node Đọc phần tử
// (ElementReadFields). ElementQueryFields (cách tìm, app, bỏ dấu, chỗ thứ mấy) dùng chung.
import NumInput from '../NumInput';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { elementSelectorError } from '../../flow/element';
import { SelectorsField } from './WebActionFields';
import { errText, Field, fmtSec, hint, NumField, SwitchField, useNodeVars } from './shared';
import { pickElement, testFind, useImageState } from '../../imageSteps';
import { inWails, openOverlay } from '../../windowMode';
import { FindAllResult } from './FindAllResult';
import { ElementSuggestions } from './ElementSuggestions';

// optional: cách tìm có thể trống (node Đọc chữ trang: trống = cả cửa sổ)
export function ElementQueryFields({ step: s, optional }: { step: Step; optional?: boolean }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const bad = elementSelectorError(s.selectors);
  return (
    <>
      <SelectorsField step={s} label={optional ? 'Chỉ đọc trong phần tử' : 'Cách tìm phần tử'} value={s.selectors} onChange={(selectors) => set({ selectors })}
        placeholder={optional ? 'trống = cả cửa sổ\nrole=table\nrole=dialog' : 'text=₫\naria=Thêm vào giỏ\nrole=button[name="Mua ngay"]'}
        emptyText={optional ? 'Trống – đọc cả cửa sổ' : 'Chưa nhập cách tìm – chạy sẽ báo lỗi'}
        help={'text= chữ trên phần tử (chứa; text="Gửi" = đúng cả chuỗi), aria= nhãn (nút chỉ có icon), role=button[name="Gửi"] vai trò + tên.'}>
        {bad && <span className={errText}>{bad}</span>}
      </SelectorsField>
      <Field label="App" wide group help="Tuỳ chọn: tên app (vd Google Chrome, Safari), bundle id (macOS) hoặc tên tệp chạy (Windows: chrome, msedge). Cửa sổ phải đang hiện trên màn – thu nhỏ / ở desktop khác thì không đọc được; trình duyệt chỉ thấy tab đang mở.">
        <VarTextInput value={s.elementApp ?? ''} onChange={(v) => set({ elementApp: v || undefined })} inputs={script.inputs ?? []} nodeVars={nodeVars}
          onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} rows={1} compact placeholder="trống = cửa sổ trên cùng" />
      </Field>
      <SwitchField label="Bỏ qua dấu" on={!s.textAccent} onChange={(v) => set({ textAccent: v ? undefined : true })} />
      {s.type !== 'findAll' && <Field label="Chỗ thứ" help="Nhiều phần tử khớp thì lấy cái thứ mấy (theo thứ tự đọc)">
        <NumInput value={Math.max(s.occurrence ?? 1, 1)} min={1} stepper onChange={(n) => set({ occurrence: n > 1 ? n : undefined })} />
      </Field>}
    </>
  );
}

// Tìm theo: Phần tử của Chờ / Click theo ảnh·chữ (37 E3): cách tìm + Chọn phần tử trên màn + Thử tìm (khung vẽ trên
// overlay; không thấy thì liệt kê các phần tử đang có để chọn lại cách tìm).
export function ElementSearchFields({ step: s }: { step: Step }) {
  const { finds, busy, error, suggestions } = useImageState();
  const find = finds[s.id];
  const btn = 'h-[34px] flex-1 rounded-control border border-line bg-surface text-[13px] text-ink enabled:hover:bg-hover disabled:opacity-50';
  return (
    <>
      <ElementQueryFields step={s} />
      <div className="col-span-2 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button onClick={() => pickElement(s.id)} disabled={!inWails || busy === s.id} className={btn}
            title={inWails ? 'Chọn phần tử trên màn: bấm vào phần tử trên màn hình – app tự viết cách tìm' : 'Chỉ dùng được trong app'}>Chọn trên màn</button>
          <button onClick={() => testFind(s.id)} disabled={!inWails || busy === s.id || !s.selectors?.some((l) => l.trim().length > 5)} className={btn}
            title="Tìm trong cây phần tử của app lúc này (không di chuột)">{busy === s.id ? 'Đang tìm…' : 'Thử tìm'}</button>
        </div>
        <ElementSuggestions list={suggestions[s.id] ?? []} current={s.selectors?.[0]}
          onPick={(g) => updateStep(s.id, { selectors: [g.selector], occurrence: g.occurrence > 1 ? g.occurrence : undefined })} />
        {find && s.type === 'findAll' ? <FindAllResult step={s} find={find} /> : find && (
          <span className={`flex flex-col gap-1 text-xs ${find.found ? 'text-ok' : 'text-warn'}`}>
            <span className="flex flex-wrap items-center gap-x-2">
              {find.found ? <>Thấy tại X {find.x + Math.round(find.w / 2)} Y {find.y + Math.round(find.h / 2)}{find.ms ? ` · ${find.ms} ms` : ''}</>
                : find.fromRun ? <>Lần chạy trước hết giờ không thấy phần tử này</> : <>Không thấy trong cửa sổ app lúc này</>}
              {find.found && <button onClick={() => openOverlay('point', s.id)} className="text-muted underline">xem trên màn hình</button>}
            </span>
            {!find.found && !!find.read?.length && (
              <span className="text-muted">Đang có: {find.read.slice(0, 12).join(' · ')}{find.read.length > 12 ? ' …' : ''}</span>
            )}
          </span>
        )}
        {error && busy === '' && <span className={errText}>{error}</span>}
        <span className={hint}>Cửa sổ app phải đang hiện trên màn (không thu nhỏ, không ở desktop khác); trình duyệt chỉ thấy tab đang mở. Cần quyền Accessibility.</span>
      </div>
    </>
  );
}
