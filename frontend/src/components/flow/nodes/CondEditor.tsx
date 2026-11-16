// Sửa một điều kiện (node Nếu / case Switch theo màn hình, bước 20 F3): thấy chữ / thấy ảnh / màu pixel / so giá trị /
// nhóm và – hoặc lồng nhau. Chỉ hiển thị: đọc cond qua props, trả phần sửa node qua set (flow/cond.ts tính);
// khoanh ảnh, chọn điểm, lấy màu là tools (app thật nối imageSteps / store, màn mẫu bỏ trống → nút tắt).
import { tr, useT } from '../../../i18n';
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

const kindList = (): { id: CondKind; label: string }[] => [
  { id: 'text', label: tr('cnd.k.text') }, { id: 'image', label: tr('cnd.k.image') }, { id: 'pixel', label: tr('cnd.k.pixel') }, { id: 'value', label: tr('cnd.k.value') },
];
const opList = (): { id: CondOp; label: string }[] => [
  { id: 'eq', label: tr('cnd.op.eq') }, { id: 'ne', label: tr('cnd.op.ne') }, { id: 'contains', label: tr('cnd.op.contains') },
  { id: 'gt', label: tr('cnd.op.gt') }, { id: 'lt', label: tr('cnd.op.lt') }, { id: 'empty', label: tr('cnd.op.empty') },
];
const selectBox = `${fieldBox} w-full text-ink`;
const btn = 'h-8 rounded-control border border-line bg-surface text-ink enabled:hover:bg-hover disabled:opacity-50';

// Ô rộng (nhãn trên) – như Field wide của inspector (stepform/shared)
const Row = ({ label, help, children }: { label?: string; help?: string; children: ReactNode }) => (
  label ? <Field label={label} wide group help={help}>{children}</Field> : <div className="col-span-2 flex flex-col gap-1.5">{children}</div>
);

// screenOnly: case Switch theo màn hình – không có "So giá trị".
export default function CondEditor({ ctx, at, screenOnly = false }: { ctx: CondCtx; at: CondAt; screenOnly?: boolean }) {
  const t = useT();
  const { step: s, set, vars, tools = {} } = ctx;
  const c = condOf(s, at) ?? emptyCond('text');
  const upd = (patch: Partial<Cond>) => set(patchCond(s, at, (x) => ({ ...x, ...patch })));
  const replace = (next: Cond) => set(patchCond(s, at, () => next));
  const nested = at.path.length > 0;
  const multi = c.kind === 'all' || c.kind === 'any';
  const kinds = screenOnly ? kindList().filter((k) => k.id !== 'value') : kindList();
  const yesNo = (yes: string, no: string) => (
    <div className="col-span-2">
      <Segmented value={c.not ? 'no' : 'yes'} full label={`${yes} / ${no}`} onChange={(v) => upd({ not: v === 'no' || undefined })}
        options={[{ id: 'yes', label: yes }, { id: 'no', label: no }]} />
    </div>
  );
  const area = (
    <Row label={t('cnd.where')}>
      <Segmented value={c.searchArea ?? 'region'} onChange={(v) => upd({ searchArea: v === 'screen' ? 'screen' : undefined })} full label={t('cnd.where')}
        options={[{ id: 'region', label: t('cnd.region') }, { id: 'screen', label: t('cnd.screen') }]} />
    </Row>
  );
  const textInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <VarTextInput value={value} onChange={onChange} rows={1} placeholder={placeholder} {...vars} />
  );

  return (
    <>
      <Row label={nested ? undefined : t('cnd.cond')}>
        <div className="flex gap-1.5">
          <div className="min-w-0 flex-1">
            <Select value={multi ? 'multi' : c.kind} aria-label={t('cnd.kind')} className={selectBox}
              onChange={(v) => {
                if (v === 'multi') replace({ kind: 'all', conds: [c, emptyCond('text')] });
                else if (v !== c.kind) replace(emptyCond(v as CondKind));
              }}
              options={[...kinds.map((o) => ({ value: o.id as string, label: o.label })), ...(nested ? [] : [{ value: 'multi', label: t('cnd.multi') }])]} />
          </div>
          {nested && (
            <button onClick={() => set(patchRoot(s, at, (root) => removeCondAt(root, at.path)))} aria-label={t('cnd.remove')} title={t('cnd.remove')}
              className="grid h-8 w-8 flex-none place-items-center rounded-control border border-line text-muted hover:bg-hover hover:text-danger-text"><Trash /></button>
          )}
        </div>
      </Row>

      {multi && (
        <>
          <div className="col-span-2">
            <Segmented value={c.kind === 'any' ? 'any' : 'all'} full label={t('cnd.join')} onChange={(kind: 'all' | 'any') => upd({ kind })}
              options={[{ id: 'all', label: t('cnd.all') }, { id: 'any', label: t('cnd.any') }]} />
          </div>
          {(c.conds ?? []).map((_, i) => (
            <div key={i} className="col-span-2 grid grid-cols-2 gap-3 rounded-card border border-line p-2.5">
              <span className="col-span-2 -mb-1 text-xs font-semibold text-muted">{t('cnd.nth', { n: i + 1 })}{i > 0 && <span className="font-normal"> · {c.kind === 'all' ? t('cnd.and') : t('cnd.or')}</span>}</span>
              <CondEditor ctx={ctx} at={{ ...at, path: [...at.path, i] }} screenOnly={screenOnly} />
            </div>
          ))}
          <button onClick={() => upd({ conds: [...(c.conds ?? []), emptyCond('text')] })}
            className="col-span-2 h-8 rounded-control border border-dashed border-line-strong text-[13px] text-muted hover:bg-hover hover:text-ink">{t('cnd.addCond')}</button>
          <SwitchField label={t('cnd.invert')} help={t('cnd.invertHelp')} on={!!c.not} onChange={(v) => upd({ not: v || undefined })} />
        </>
      )}

      {c.kind === 'text' && (
        <>
          {yesNo(t('cnd.t.yes'), t('cnd.t.no'))}
          <Row label={t('cnd.t.text')}>
            {textInput(c.findText ?? '', (findText) => upd({ findText }), t('cnd.t.ph'))}
            {!c.findText?.trim() && <span className={errText}>{t('cnd.t.empty')}</span>}
          </Row>
          <SwitchField label={t('cnd.t.exact')} help={t('cnd.t.exactHelp')} on={!!c.textExact} onChange={(v) => upd({ textExact: v || undefined })} />
          <SwitchField label={t('cnd.t.accent')} on={!c.textAccent} onChange={(v) => upd({ textAccent: v ? undefined : true })} />
          {area}
        </>
      )}

      {c.kind === 'image' && <ImageCond c={c} upd={upd} capture={tools.capture && (() => tools.capture!(at))} yesNo={yesNo(t('cnd.i.yes'), t('cnd.i.no'))} area={area} />}

      {c.kind === 'pixel' && (
        <>
          {yesNo(t('cnd.p.yes'), t('cnd.p.no'))}
          <Row label={t('cnd.p.point')}>
            {c.points?.[0] ? (
              <AnchorField value={c.points[0]} onChange={(p) => upd({ points: [{ ...c.points![0], ...p }] })}
                onAnchor={tools.reanchor && ((ax, ay) => upd({ points: [tools.reanchor!(c.points![0], ax, ay)] }))}
                pick={<button aria-label={t('cnd.p.pick')} title={t('cnd.p.pick')} disabled={!tools.pickPoint} onClick={() => tools.pickPoint?.(at)}
                  className="grid h-[34px] w-[34px] flex-none place-items-center rounded-control border border-line text-muted enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-50"><Target /></button>} />
            ) : (
              <button onClick={() => tools.pickPoint?.(at)} disabled={!tools.pickPoint} className={btn}>{t('cnd.p.pickPt')}</button>
            )}
          </Row>
          <Row label={t('cnd.p.color')}>
            <div className="flex gap-2">
              <span className={`${fieldBox} flex-1 gap-2 ${/^#[0-9a-fA-F]{6}$/.test(c.color ?? '') ? '' : 'border-danger'}`}>
                <span className="h-4 w-4 flex-none rounded border border-line" style={{ background: c.color }} />
                <input value={c.color ?? ''} onChange={(e) => upd({ color: e.target.value.trim() })} spellCheck={false} aria-label={t('cnd.p.color')}
                  className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none" />
              </span>
              <button onClick={() => tools.pickColor?.(at)} disabled={!tools.pickColor || !c.points?.[0] || tools.busy}
                title={t('cnd.p.getTip')} className={`${btn} px-2.5 text-[13px] whitespace-nowrap`}>{t('cnd.p.get')}</button>
            </div>
          </Row>
          <Field label={t('cnd.p.tol')} help={t('cnd.p.tolHelp', { n: c.tolerance ?? 0 })}>
            <NumInput prefix="±" value={c.tolerance ?? 0} onChange={(tolerance) => upd({ tolerance: Math.min(tolerance, 255) })} />
          </Field>
        </>
      )}

      {c.kind === 'value' && (
        <Row label={t('cnd.v.cmp')} help={t('cnd.v.help')}>
          {textInput(c.left ?? '', (left) => upd({ left }), '{{n2.output.text}}')}
          <Select value={c.op ?? 'eq'} onChange={(op) => upd({ op })} className={selectBox} aria-label={t('cnd.v.op')}
            options={opList().map((o) => ({ value: o.id, label: o.label }))} />
          {c.op !== 'empty' && textInput(c.right ?? '', (right) => upd({ right }), 'Lan')}
        </Row>
      )}
      {c.kind === 'value' && (
        <SwitchField label={t('cnd.invert1')} help={t('cnd.invertHelp')} on={!!c.not} onChange={(v) => upd({ not: v || undefined })} />
      )}
    </>
  );
}

function ImageCond({ c, upd, capture, yesNo, area }: {
  c: Cond; upd: (p: Partial<Cond>) => void; capture?: () => void; yesNo: ReactNode; area: ReactNode;
}) {
  const t = useT();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const k = c.templateScale || 1;
  return (
    <>
      {yesNo}
      <Row label={t('cnd.i.tpl')}>
        <div className="relative grid min-h-[72px] place-items-center overflow-hidden rounded-card border border-line bg-soft p-2 text-[13px]">
          {c.template ? (
            <>
              <img src={`data:image/png;base64,${c.template}`} alt={t('cnd.i.tpl')} className="max-h-[110px] max-w-full object-contain"
                style={size ? { width: Math.min(size.w / k, 280) } : undefined}
                onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
              {size && <span className="absolute right-1.5 bottom-1.5 rounded bg-hud/80 px-1.5 font-mono text-[11px] text-hud-text">{Math.round(size.w / k)} × {Math.round(size.h / k)}</span>}
            </>
          ) : t('cnd.i.none')}
        </div>
        <button onClick={capture} disabled={!capture} className={btn}>{c.template ? t('cnd.i.redo') : t('cnd.i.cap')}</button>
        {!c.template && <span className={errText}>{t('cnd.i.err')}</span>}
      </Row>
      <Field label={t('cnd.i.thr')} help={t('cnd.i.thrHelp')}>
        <NumInput value={c.threshold ?? 90} min={1} unit="%" onChange={(threshold) => upd({ threshold: Math.min(threshold, 100) })} />
      </Field>
      <MatchFields value={c} onChange={upd} />
      {area}
    </>
  );
}
