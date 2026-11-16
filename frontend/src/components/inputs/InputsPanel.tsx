// Tab Input của inspector (artboard InputsTab): các giá trị hỏi khi bấm Chạy, theo thứ tự – kéo ⋮⋮ để sắp xếp,
// bấm một dòng để mở rộng sửa key / nhãn / kiểu / mặc định / bắt buộc / gợi ý, xoá input.
import { useT } from '../../i18n';
import Select from '../Select';
import { ReactNode, useEffect, useState } from 'react';
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash } from '../icons';
import { Switch } from '../Switch';
import { fieldBox } from '../NumInput';
import { fmtValue, INPUT_TYPE_LABEL, InputType, InputView, ScriptInput } from './model';

type Props = {
  inputs: InputView[];
  onUpdate: (key: string, patch: Partial<ScriptInput>) => string | null | void; // trả lỗi (key trùng / sai) nếu có
  onRemove: (key: string) => void;
  onMove: (from: string, to: string) => void;
  onAdd?: () => void;
  footer?: ReactNode; // thêm ở cuối (vd "đang chạy luôn không hỏi")
};

// Kiểu đổi được khi input đang ghim vào trường số / bật tắt.
const kindTypes: Record<string, InputType[]> = { int: ['number', 'ms'], bool: ['bool'] };

export default function InputsPanel({ inputs, onUpdate, onRemove, onMove, onAdd, footer }: Props) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <p className="text-xs text-muted">{t('ip.intro')}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={inputs.map((i) => i.key)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {inputs.map((inp) => (
              <Row key={inp.key} inp={inp} open={open === inp.key} onToggle={() => setOpen(open === inp.key ? null : inp.key)}
                onChange={(p) => {
                  const err = onUpdate(inp.key, p);
                  if (!err && p.key) setOpen(p.key);
                  return err;
                }}
                onRemove={() => onRemove(inp.key)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {inputs.length === 0 && <p className="py-4 text-center text-[13px] text-muted">{t('ip.none1')} {'{{'} {t('ip.none2')}</p>}
      <button onClick={onAdd} disabled={!onAdd}
        className="h-[38px] rounded-lg border border-dashed border-line-strong text-muted enabled:hover:bg-hover enabled:hover:text-ink">{t('ip.add')}</button>
      {footer}
      <p className="mt-auto text-xs text-muted">{t('ip.note')}</p>
    </div>
  );
}

function Row({ inp, open, onToggle, onChange, onRemove }: {
  inp: InputView; open: boolean; onToggle: () => void;
  onChange: (p: Partial<ScriptInput>) => string | null | void; onRemove: () => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: inp.key });
  const handle = (
    <span ref={setActivatorNodeRef} {...listeners} {...attributes} aria-label={t('ip.drag', { n: inp.label })}
      className="cursor-grab touch-none text-muted active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>⋮⋮</span>
  );
  const used = inp.usedBy.map((u) => `B${u.n}`).join(', ');
  const style = { transform: CSS.Translate.toString(transform), transition };
  const lift = isDragging ? 'relative z-10 shadow-[0_6px_20px_rgb(0_0_0/.18)]' : '';

  if (!open) {
    return (
      <div ref={setNodeRef} style={style} onClick={onToggle}
        className={`flex cursor-default items-center gap-2.5 rounded-card border border-line bg-surface px-2.5 py-[9px] hover:bg-hover ${lift}`}>
        {handle}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-semibold"><span className="truncate">{inp.label}</span>{inp.required && <span className="text-warn">*</span>}</div>
          <div className="truncate font-mono text-xs text-muted">{inp.key}  ·  {inp.required && inp.default === undefined ? t('ip.required') : t('ip.default', { v: fmtValue(inp.default, inp.unit) })}</div>
        </div>
        <span className="rounded-[5px] bg-soft px-[7px] py-0.5 text-[11px] whitespace-nowrap text-muted">{INPUT_TYPE_LABEL[inp.type]}</span>
        {used
          ? <span className="rounded-[5px] border border-line px-1.5 py-px font-mono text-[11px] text-muted">{used}</span>
          : <span className="text-[11px] text-warn" title={t('ip.unusedTip')}>{t('ip.unused')}</span>}
      </div>
    );
  }

  const label = 'flex flex-col gap-[5px] text-[13px] text-muted';
  const input = `${fieldBox} text-sm text-ink outline-none`;
  const pinnedKind = inp.targets?.length ? (inp.targets[0].field === 'enabled' ? 'bool' : 'int') : null;
  const types = pinnedKind ? kindTypes[pinnedKind] : (Object.keys(INPUT_TYPE_LABEL) as InputType[]);
  return (
    <div ref={setNodeRef} style={style} className={`ring-selected flex flex-col gap-2.5 rounded-card p-3 ${lift}`}>
      <div className="flex items-center gap-2.5" onClick={onToggle}>
        {handle}
        <span className="var-token text-[13px]">{inp.key}</span>
        <span className={`truncate text-xs ${used ? 'text-muted' : 'text-warn'}`}>
          {used ? t('ip.usedIn', { l: inp.usedBy.map((u) => `B${u.n} ${u.title}`).join(', ') }) : t('ip.unusedTip')}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={t('ip.del')} title={t('ip.delTip')}
          className="ml-auto grid h-7 w-7 flex-none place-items-center rounded-md text-muted hover:bg-hover hover:text-danger-text"><Trash className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>{t('ip.label')}
          <input value={inp.label} onChange={(e) => onChange({ label: e.target.value })} className={input} />
        </label>
        <KeyField value={inp.key} onCommit={(key) => onChange({ key })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>{t('ip.type')}
          <Select value={inp.type as string} onChange={(ty) => onChange({ type: ty as InputType })} className={input} aria-label={t('ip.type')}
            title={pinnedKind ? t('ip.pinnedTip') : undefined}
            options={types.map((k) => ({ value: k as string, label: INPUT_TYPE_LABEL[k] }))} />
        </label>
        {inp.type === 'bool' ? (
          <div className={label}>{t('ip.defaultCap')}
            <span className="flex h-8 items-center"><Switch on={inp.default === true} onChange={(v) => onChange({ default: v })} label={t('ip.defaultCap')} /></span>
          </div>
        ) : inp.type === 'select' ? (
          <label className={label}>{t('ip.defaultCap')}
            <Select value={inp.default === undefined ? '' : String(inp.default)} onChange={(d) => onChange({ default: d })} className={input} aria-label={t('ip.defaultCap')}
              options={[{ value: '', label: t('ip.blank') }, ...(inp.options ?? []).map((o) => ({ value: o, label: o }))]} />
          </label>
        ) : (
          <DefaultField inp={inp} onCommit={(v) => onChange({ default: v })} className={`${input} font-mono`} />
        )}
      </div>
      {inp.type === 'select' && <OptionsField value={inp.options ?? []} onChange={(options) => onChange({ options })} />}
      <label className="flex items-center justify-between text-[13px]">{t('ip.req')}
        <Switch on={!!inp.required} onChange={(required) => onChange({ required })} label={t('ip.req')} />
      </label>
      <label className={label}>{t('ip.hint')}
        <input value={inp.hint ?? ''} onChange={(e) => onChange({ hint: e.target.value })} className={input} />
      </label>
    </div>
  );
}

// Key: sửa nháp, Enter / rời ô mới đổi (đổi key = đổi luôn {{key}} trong ô chữ); lỗi hiện dưới ô.
function KeyField({ value, onCommit }: { value: string; onCommit: (key: string) => string | null | void }) {
  const t = useT();
  const [draft, setDraft] = useState(value);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft === value) return setErr(null);
    setErr(onCommit(draft) || null);
  };
  return (
    <label className="flex flex-col gap-[5px] text-[13px] text-muted">Key
      <input value={draft} onChange={(e) => setDraft(e.target.value.trim())} onBlur={commit} spellCheck={false}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className={`${fieldBox} font-mono text-sm text-ink outline-none ${err ? 'border-danger' : ''}`} />
      {err && <span className="text-xs text-danger-text">{err}</span>}
    </label>
  );
}

// Mặc định dạng chữ / số: giữ nháp khi gõ, số sai thì báo (không ghi).
function DefaultField({ inp, onCommit, className }: { inp: InputView; onCommit: (v: string) => void; className: string }) {
  const t = useT();
  const shown = inp.default === undefined ? '' : String(inp.default);
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  const isNum = inp.type === 'number' || inp.type === 'ms';
  const bad = isNum && draft !== '' && !/^\d+$/.test(draft.trim());
  return (
    <label className="flex flex-col gap-[5px] text-[13px] text-muted">{t('ip.defaultCap')}
      <input value={draft} placeholder={t('ip.blank')} inputMode={isNum ? 'numeric' : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          if (!isNum || e.target.value === '' || /^\d+$/.test(e.target.value.trim())) onCommit(e.target.value);
        }}
        onBlur={() => setDraft(shown)} className={`${className} ${bad ? 'border-danger' : ''}`} />
    </label>
  );
}

// Danh sách chọn: mỗi lựa chọn một dòng.
function OptionsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useT();
  const [draft, setDraft] = useState(value.join('\n'));
  return (
    <label className="flex flex-col gap-[5px] text-[13px] text-muted">{t('ip.options')} <span className="text-xs">{t('ip.optionsNote')}</span>
      <textarea value={draft} rows={3} onChange={(e) => {
          setDraft(e.target.value);
          onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean));
        }}
        className="rounded-control border border-line bg-field px-2.5 py-1.5 text-sm text-ink outline-none focus:ring-focus" />
    </label>
  );
}
