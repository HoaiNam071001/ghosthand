// Node HTTP (bước 35 N3): method, URL, tham số, header, body – mọi ô nhận {{biến}}; gợi ý đọc kết quả.
import { useT } from '../../i18n';
import Select from '../Select';
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { BODY_TYPES, hasBody, HTTP_METHODS, jsonBodyValid, type BodyType, type HttpMethod } from '../../flow/http';
import { Step } from '../../types';
import { KVTable } from './KVTable';
import { CurlImport } from './CurlImport';
import { fieldBox } from '../NumInput';
import { errText, Field, hint, NumField, useNodeVars } from './shared';

export function HttpFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const body = s.bodyType ?? '';
  const valid = body === 'json' ? jsonBodyValid(s.body ?? '') : null;
  // đổi sang POST / PUT / PATCH khi chưa có body → mở sẵn thân JSON
  const setMethod = (method: HttpMethod) => set(hasBody(method) && !s.bodyType ? { method, bodyType: 'json', body: s.body || '{\n  \n}' } : { method });
  return (
    <>
      <CurlImport step={s} />
      <Field label={t('ht.call')} wide group help={t('ht.callHelp')}>
        <div className="flex items-start gap-1.5">
          <div className="w-[92px] flex-none">
            <Select value={s.method || 'GET'} onChange={(m) => setMethod(m as HttpMethod)} aria-label="Method" className={`${fieldBox} font-mono font-semibold text-ink`}
              options={HTTP_METHODS.map((m) => ({ value: m as string, label: m }))} />
          </div>
          <div className="min-w-0 flex-1">
            <VarTextInput {...varProps} rows={1} compact value={s.url ?? ''} onChange={(url) => set({ url })} placeholder="https://api.example.com/…" />
          </div>
        </div>
      </Field>
      <KVTable title={t('ht.query')} rows={s.query} onChange={(query) => set({ query })} keyHint="q" valueHint="{{keyword}}" varProps={varProps} />
      <KVTable title="Header" rows={s.headers} onChange={(headers) => set({ headers })} keyHint="Authorization" valueHint="{{token}}" varProps={varProps}
        help={t('ht.headerHelp')} />
      <Field label="Body" wide group>
        <Segmented value={body} options={BODY_TYPES} full label={t('ht.bodyType')}
          onChange={(bodyType: BodyType) => set({ bodyType: bodyType || undefined, body: bodyType === 'json' && !s.body ? '{\n  \n}' : s.body })} />
      </Field>
      {(body === 'json' || body === 'text') && (
        <div className="col-span-2 -mt-1.5 flex flex-col gap-1.5">
          <VarTextInput {...varProps} rows={6} value={s.body ?? ''} onChange={(v) => set({ body: v })}
            placeholder={body === 'json' ? '{\n  "name": "{{name}}",\n  "qty": 2\n}' : t('ht.textPh')} />
          {body === 'json' && <span className={valid === false ? errText : hint}>
            {valid === false ? t('ht.jsonBad') : t('ht.jsonTip')}
          </span>}
        </div>
      )}
      {body === 'form' && <KVTable title={t('ht.form')} rows={s.form} onChange={(form) => set({ form })} keyHint="email" valueHint="{{email}}" varProps={varProps} />}
      <NumField label={t('ht.wait')} info={t('ht.waitInfo')} step={s} field="timeoutMs" unit="ms" min={1} />
      <div className="col-span-2 flex flex-col gap-1 rounded-card bg-soft px-3 py-2.5 text-xs text-muted">
        <span className="font-semibold text-ink">{t('ht.result')}</span>
        <span><span className="font-mono text-ink">{`{{${s.ref}.output.status}}`}</span> {t('ht.status')} · <span className="font-mono text-ink">{`{{${s.ref}.output.json.data.id}}`}</span> {t('ht.deep')} <span className="font-mono">items.0</span>)</span>
        <span>{t('ht.codes1')} <span className="text-ok">{t('ht.ok')}</span>; {t('ht.codes2')} <span className="text-danger-text">{t('ht.fail')}</span> {t('ht.codes3')}</span>
      </div>
    </>
  );
}
