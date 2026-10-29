// Form đối số của node Gọi tool MCP, dựng từ inputSchema (bước 55 M4). Chỉ hiển thị: đối số nằm ở chuỗi JSON `args`,
// mỗi ô sửa một trường qua setArg (flow/mcpSchema.ts). Ô chữ nhận {{biến}}.
import Select from '../Select';
import { Switch } from '../Switch';
import VarTextInput from '../inputs/VarTextInput';
import { listToText, numberError, parseArgs, parseNumberInput, SchemaField, setArg, textToList } from '../../flow/mcpSchema';
import { fieldBox } from '../NumInput';
import { Field, errText, selectBox } from './shared';
import type { ComponentProps } from 'react';

type VarProps = Pick<ComponentProps<typeof VarTextInput>, 'inputs' | 'nodeVars' | 'onCreateInput'>;
type Props = { fields: SchemaField[]; args: string; onChange: (args: string) => void; varProps: VarProps };

export default function MCPSchemaForm({ fields, args, onChange, varProps }: Props) {
  const cur = parseArgs(args) ?? {};
  const put = (name: string, v: unknown) => onChange(setArg(args, name, v));
  return (
    <>
      {fields.map((f) => {
        const v = cur[f.name];
        const label = f.required ? `${f.name} *` : f.name;
        return (
          <Field key={f.name} label={label} wide group help={f.desc || undefined}>
            {f.kind === 'string' && <VarTextInput {...varProps} rows={1} compact value={typeof v === 'string' ? v : ''} onChange={(t) => put(f.name, t)} />}
            {(f.kind === 'number' || f.kind === 'integer') && (
              <>
                <input className={`${fieldBox} font-mono`} aria-label={f.name} inputMode="decimal" value={v === undefined ? '' : String(v)} spellCheck={false}
                  onChange={(e) => put(f.name, parseNumberInput(e.target.value, f.kind === 'integer'))} />
                {numberError(v) && <span className={errText}>{numberError(v)}</span>}
              </>
            )}
            {f.kind === 'boolean' && <Switch on={v === true} onChange={(on) => put(f.name, on)} label={f.name} />}
            {f.kind === 'enum' && (
              <Select value={typeof v === 'string' ? v : ''} className={selectBox} aria-label={f.name} onChange={(t) => put(f.name, t || undefined)}
                options={[{ value: '', label: '(không chọn)' }, ...f.options.map((o) => ({ value: o, label: o }))]} />
            )}
            {f.kind === 'stringList' && (
              <textarea className={`${fieldBox} font-mono`} rows={3} aria-label={f.name} placeholder="mỗi dòng một giá trị" spellCheck={false}
                value={listToText(v)} onChange={(e) => put(f.name, textToList(e.target.value))} />
            )}
            {f.kind === 'json' && <JSONCell name={f.name} value={v} onChange={(x) => put(f.name, x)} />}
          </Field>
        );
      })}
    </>
  );
}

// Trường schema phức tạp (object, mảng lồng…): ô JSON riêng của trường; chữ chưa hợp lệ chỉ báo, không ghi đè.
function JSONCell({ name, value, onChange }: { name: string; value: unknown; onChange: (v: unknown) => void }) {
  const text = value === undefined ? '' : JSON.stringify(value);
  return (
    <textarea className={`${fieldBox} font-mono`} rows={2} aria-label={name} placeholder="JSON" spellCheck={false} defaultValue={text}
      onChange={(e) => {
        const t = e.target.value.trim();
        if (t === '') return onChange(undefined);
        try { onChange(JSON.parse(t)); } catch { /* chưa xong – giữ giá trị cũ */ }
      }} />
  );
}
