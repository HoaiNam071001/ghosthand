// Bảng tên – giá trị (query / header / form của node HTTP, bước 35 N3): ô tên + ô giá trị nhận {{biến}} + xoá dòng.
// Tên có chữ kiểu token / key / auth (isSecretKey) → ổ khoá: giá trị không hiện trong lời báo lỗi.
import { useT } from '../../i18n';
import { fieldBox } from '../NumInput';
import VarTextInput from '../inputs/VarTextInput';
import { isSecretKey } from '../../flow/http';
import type { KV } from '../../types';
import { Field } from './shared';

type VarProps = { inputs: { key: string; label: string }[]; nodeVars: { key: string; label: string }[]; onCreateInput: (key: string) => void };

export function KVTable({ title, rows = [], onChange, keyHint, valueHint, varProps, help }: {
  title: string; rows?: KV[]; onChange: (rows: KV[] | undefined) => void; keyHint: string; valueHint: string; varProps: VarProps; help?: string;
}) {
  const t = useT();
  const set = (i: number, p: Partial<KV>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const remove = (i: number) => {
    const next = rows.filter((_, j) => j !== i);
    onChange(next.length ? next : undefined);
  };
  return (
    <Field label={title} wide group help={help} side={rows.length > 0 && <span className="text-xs text-muted">{t('kv.rows', { n: rows.length })}</span>}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <label className={`${fieldBox} w-[44%] flex-none gap-1.5`}>
            {isSecretKey(r.key) && <Lock title={t('kv.secret')} />}
            <input value={r.key} onChange={(e) => set(i, { key: e.target.value })} placeholder={keyHint} spellCheck={false} aria-label={t('kv.rowName', { title, n: i + 1 })}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-muted" />
          </label>
          <div className="min-w-0 flex-1">
            <VarTextInput {...varProps} rows={1} compact value={r.value} onChange={(value) => set(i, { value })} placeholder={valueHint} />
          </div>
          <button onClick={() => remove(i)} aria-label={t('kv.del', { n: i + 1 })} title={t('kv.delTip')}
            className="grid h-8 w-7 flex-none place-items-center rounded-control text-muted hover:bg-hover hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...rows, { key: '', value: '' }])}
        className="h-8 w-fit rounded-control border border-dashed border-line-strong px-3 text-[13px] text-ink hover:bg-hover">{t('kv.add')}</button>
    </Field>
  );
}

const Lock = ({ title }: { title: string }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-none text-warn" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <title>{title}</title><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
