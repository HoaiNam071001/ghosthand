// Sửa một điều kiện (node Nếu / case Switch theo màn hình, bước 20 F3): thấy chữ / thấy ảnh / màu pixel / so giá trị /
// nhóm và – hoặc lồng nhau. Chỉ hiển thị: đọc cond qua props, trả phần sửa node qua set (flow/cond.ts tính);
// khoanh ảnh, chọn điểm, lấy màu là tools (app thật nối imageSteps / store, màn mẫu bỏ trống → nút tắt).
import Select from '../../Select';
import { ReactNode, useState } from 'react';
import NumInput, { fieldBox } from '../../NumInput';
import Segmented from '../../Segmented';
import { Target, Trash } from '../../icons';
import AnchorField from '../../steps/AnchorField';
import { errText, Field, SwitchField } from '../../stepform/shared';
import MatchFields from '../../stepform/MatchFields';
import VarTextInput from '../../inputs/VarTextInput';
import { CondAt, condOf, emptyCond, patchCond, patchRoot, removeCondAt } from '../../../flow/cond';
import type { Anchor, Cond, CondKind, CondOp, ScriptInput, Step, StepPoint } from '../../../types';

export type VarProps = {
  inputs: Pick<ScriptInput, 'key' | 'label'>[];
  nodeVars?: { key: string; label: string }[];
  onCreateInput?: (key: string) => void;
};
export type CondTools = {
  capture?: (at: CondAt) => void; // khoanh ảnh mẫu trên overlay
  pickPoint?: (at: CondAt) => void; // chọn điểm màu trên overlay
  pickColor?: (at: CondAt) => void; // lấy màu đang hiện tại điểm
  reanchor?: (p: StepPoint, ax: Anchor, ay: Anchor) => StepPoint; // đổi neo, giữ chỗ trên màn hình
  busy?: boolean;
  previewList?: () => Promise<ListPreview>; // Lặp qua danh sách: đọc thử danh sách (Go PreviewList)
  previewText?: () => Promise<TextPreview>; // node xử lý chữ: chạy thử trên chữ đang nhập (Go PreviewText)
};
// Kết quả đọc thử danh sách – khớp engine.ListPreview (foreach.go).
export type ListPreview = { count: number; columns?: { name: string; key: string }[]; first?: unknown };
// Kết quả chạy thử node xử lý chữ – khớp app.TextPreview (textapi.go).
export type TextPreview = { port: string; output?: Record<string, unknown> };
export type CondCtx = { step: Step; set: (p: Partial<Step>) => void; vars: VarProps; tools?: CondTools };

const KINDS: { id: CondKind; label: string }[] = [
  { id: 'text', label: 'Thấy chữ' }, { id: 'image', label: 'Thấy ảnh' }, { id: 'pixel', label: 'Màu pixel' }, { id: 'value', label: 'So giá trị' },
];
export const OPS: { id: CondOp; label: string }[] = [
  { id: 'eq', label: 'bằng' }, { id: 'ne', label: 'khác' }, { id: 'contains', label: 'chứa' },
  { id: 'gt', label: 'lớn hơn' }, { id: 'lt', label: 'nhỏ hơn' }, { id: 'empty', label: 'trống' },
];
const selectBox = `${fieldBox} w-full text-ink`;
const btn = 'h-8 rounded-control border border-line bg-surface text-ink enabled:hover:bg-hover disabled:opacity-50';

// Ô rộng (nhãn trên) – như Field wide của inspector (stepform/shared)
const Row = ({ label, help, children }: { label?: string; help?: string; children: ReactNode }) => (
  label ? <Field label={label} wide group help={help}>{children}</Field> : <div className="col-span-2 flex flex-col gap-1.5">{children}</div>
);

// screenOnly: case Switch theo màn hình – không có "So giá trị".
export default function CondEditor({ ctx, at, screenOnly = false }: { ctx: CondCtx; at: CondAt; screenOnly?: boolean }) {
  const { step: s, set, vars, tools = {} } = ctx;
  const c = condOf(s, at) ?? emptyCond('text');
  const upd = (patch: Partial<Cond>) => set(patchCond(s, at, (x) => ({ ...x, ...patch })));
  const replace = (next: Cond) => set(patchCond(s, at, () => next));
  const nested = at.path.length > 0;
  const multi = c.kind === 'all' || c.kind === 'any';
  const kinds = screenOnly ? KINDS.filter((k) => k.id !== 'value') : KINDS;
  const yesNo = (yes: string, no: string) => (
    <div className="col-span-2">
      <Segmented value={c.not ? 'no' : 'yes'} full label={`${yes} / ${no}`} onChange={(v) => upd({ not: v === 'no' || undefined })}
        options={[{ id: 'yes', label: yes }, { id: 'no', label: no }]} />
    </div>
  );
  const area = (
    <Row label="Tìm trong">
      <Segmented value={c.searchArea ?? 'region'} onChange={(v) => upd({ searchArea: v === 'screen' ? 'screen' : undefined })} full label="Tìm trong"
        options={[{ id: 'region', label: 'Vùng của kịch bản' }, { id: 'screen', label: 'Cả màn hình' }]} />
    </Row>
  );
  const textInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <VarTextInput value={value} onChange={onChange} rows={1} placeholder={placeholder} {...vars} />
  );

  return (
    <>
      <Row label={nested ? undefined : 'Điều kiện'}>
        <div className="flex gap-1.5">
          <div className="min-w-0 flex-1">
            <Select value={multi ? 'multi' : c.kind} aria-label="Loại điều kiện" className={selectBox}
              onChange={(v) => {
                if (v === 'multi') replace({ kind: 'all', conds: [c, emptyCond('text')] });
                else if (v !== c.kind) replace(emptyCond(v as CondKind));
              }}
              options={[...kinds.map((o) => ({ value: o.id as string, label: o.label })), ...(nested ? [] : [{ value: 'multi', label: 'Nhiều điều kiện (và / hoặc)' }])]} />
          </div>
          {nested && (
            <button onClick={() => set(patchRoot(s, at, (root) => removeCondAt(root, at.path)))} aria-label="Bỏ điều kiện này" title="Bỏ điều kiện này"
              className="grid h-8 w-8 flex-none place-items-center rounded-control border border-line text-muted hover:bg-hover hover:text-danger-text"><Trash /></button>
          )}
        </div>
      </Row>

      {multi && (
        <>
          <div className="col-span-2">
            <Segmented value={c.kind === 'any' ? 'any' : 'all'} full label="Cách ghép" onChange={(kind: 'all' | 'any') => upd({ kind })}
              options={[{ id: 'all', label: 'Tất cả đúng (và)' }, { id: 'any', label: 'Một cái đúng (hoặc)' }]} />
          </div>
          {(c.conds ?? []).map((_, i) => (
            <div key={i} className="col-span-2 grid grid-cols-2 gap-3 rounded-card border border-line p-2.5">
              <span className="col-span-2 -mb-1 text-xs font-semibold text-muted">Điều kiện {i + 1}{i > 0 && <span className="font-normal"> · {c.kind === 'all' ? 'và' : 'hoặc'}</span>}</span>
              <CondEditor ctx={ctx} at={{ ...at, path: [...at.path, i] }} screenOnly={screenOnly} />
            </div>
          ))}
          <button onClick={() => upd({ conds: [...(c.conds ?? []), emptyCond('text')] })}
            className="col-span-2 h-8 rounded-control border border-dashed border-line-strong text-[13px] text-muted hover:bg-hover hover:text-ink">+ Thêm điều kiện</button>
          <SwitchField label="Đảo cả nhóm" help="Đúng ↔ sai" on={!!c.not} onChange={(v) => upd({ not: v || undefined })} />
        </>
      )}

      {c.kind === 'text' && (
        <>
          {yesNo('Thấy chữ', 'Không thấy chữ')}
          <Row label="Chữ cần thấy">
            {textInput(c.findText ?? '', (findText) => upd({ findText }), 'Nhắn tin')}
            {!c.findText?.trim() && <span className={errText}>Chưa nhập chữ – chạy sẽ báo lỗi.</span>}
          </Row>
          <SwitchField label="Cả dòng" help="Chỉ khớp ô / nút chỉ có đúng chữ này" on={!!c.textExact} onChange={(v) => upd({ textExact: v || undefined })} />
          <SwitchField label="Bỏ qua dấu" on={!c.textAccent} onChange={(v) => upd({ textAccent: v ? undefined : true })} />
          {area}
        </>
      )}

      {c.kind === 'image' && <ImageCond c={c} upd={upd} capture={tools.capture && (() => tools.capture!(at))} yesNo={yesNo('Thấy ảnh', 'Không thấy ảnh')} area={area} />}

      {c.kind === 'pixel' && (
        <>
          {yesNo('Có màu này', 'Khác màu này')}
          <Row label="Điểm">
            {c.points?.[0] ? (
              <AnchorField value={c.points[0]} onChange={(p) => upd({ points: [{ ...c.points![0], ...p }] })}
                onAnchor={tools.reanchor && ((ax, ay) => upd({ points: [tools.reanchor!(c.points![0], ax, ay)] }))}
                pick={<button aria-label="Chọn trên màn hình" title="Chọn trên màn hình" disabled={!tools.pickPoint} onClick={() => tools.pickPoint?.(at)}
                  className="grid h-[34px] w-[34px] flex-none place-items-center rounded-control border border-line text-muted enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-50"><Target /></button>} />
            ) : (
              <button onClick={() => tools.pickPoint?.(at)} disabled={!tools.pickPoint} className={btn}>Chọn điểm trên màn hình</button>
            )}
          </Row>
          <Row label="Màu">
            <div className="flex gap-2">
              <span className={`${fieldBox} flex-1 gap-2 ${/^#[0-9a-fA-F]{6}$/.test(c.color ?? '') ? '' : 'border-danger'}`}>
                <span className="h-4 w-4 flex-none rounded border border-line" style={{ background: c.color }} />
                <input value={c.color ?? ''} onChange={(e) => upd({ color: e.target.value.trim() })} spellCheck={false} aria-label="Màu"
                  className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none" />
              </span>
              <button onClick={() => tools.pickColor?.(at)} disabled={!tools.pickColor || !c.points?.[0] || tools.busy}
                title="Lấy màu đang hiện tại điểm này trên màn hình" className={`${btn} px-2.5 text-[13px] whitespace-nowrap`}>Lấy màu</button>
            </div>
          </Row>
          <Field label="Sai số màu" help={`Mỗi kênh R / G / B lệch ≤ ${c.tolerance ?? 0}`}>
            <NumInput prefix="±" value={c.tolerance ?? 0} onChange={(tolerance) => upd({ tolerance: Math.min(tolerance, 255) })} />
          </Field>
        </>
      )}

      {c.kind === 'value' && (
        <Row label="So sánh" help="Mỗi vế gõ chữ hoặc {{biến}}. Bằng / khác / chứa không phân biệt hoa thường; lớn / nhỏ so số.">
          {textInput(c.left ?? '', (left) => upd({ left }), '{{n2.output.text}}')}
          <Select value={c.op ?? 'eq'} onChange={(op) => upd({ op })} className={selectBox} aria-label="Phép so"
            options={OPS.map((o) => ({ value: o.id, label: o.label }))} />
          {c.op !== 'empty' && textInput(c.right ?? '', (right) => upd({ right }), 'Lan')}
        </Row>
      )}
      {c.kind === 'value' && (
        <SwitchField label="Đảo" help="Đúng ↔ sai" on={!!c.not} onChange={(v) => upd({ not: v || undefined })} />
      )}
    </>
  );
}

function ImageCond({ c, upd, capture, yesNo, area }: {
  c: Cond; upd: (p: Partial<Cond>) => void; capture?: () => void; yesNo: ReactNode; area: ReactNode;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const k = c.templateScale || 1;
  return (
    <>
      {yesNo}
      <Row label="Ảnh mẫu">
        <div className="relative grid min-h-[72px] place-items-center overflow-hidden rounded-card border border-line bg-soft p-2 text-[13px]">
          {c.template ? (
            <>
              <img src={`data:image/png;base64,${c.template}`} alt="Ảnh mẫu" className="max-h-[110px] max-w-full object-contain"
                style={size ? { width: Math.min(size.w / k, 280) } : undefined}
                onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
              {size && <span className="absolute right-1.5 bottom-1.5 rounded bg-hud/80 px-1.5 font-mono text-[11px] text-hud-text">{Math.round(size.w / k)} × {Math.round(size.h / k)}</span>}
            </>
          ) : 'Chưa có ảnh mẫu – bấm “Khoanh ảnh mẫu”'}
        </div>
        <button onClick={capture} disabled={!capture} className={btn}>{c.template ? 'Khoanh lại' : 'Khoanh ảnh mẫu'}</button>
        {!c.template && <span className={errText}>Chưa có ảnh mẫu – chạy sẽ báo lỗi.</span>}
      </Row>
      <Field label="Độ khớp tối thiểu" help="Ảnh khoanh đúng thường khớp 95–100%">
        <NumInput value={c.threshold ?? 90} min={1} unit="%" onChange={(threshold) => upd({ threshold: Math.min(threshold, 100) })} />
      </Field>
      <MatchFields value={c} onChange={upd} />
      {area}
    </>
  );
}
