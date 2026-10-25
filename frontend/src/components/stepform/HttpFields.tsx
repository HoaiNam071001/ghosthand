// Node HTTP (bước 35 N3): method, URL, tham số, header, body – mọi ô nhận {{biến}}; gợi ý đọc kết quả.
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
      <Field label="Gọi tới" wide group help="Biến trong URL chèn nguyên văn – giá trị có dấu cách / tiếng Việt đặt ở bảng Tham số (tự mã hoá).">
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
      <KVTable title="Tham số (query)" rows={s.query} onChange={(query) => set({ query })} keyHint="tim" valueHint="{{tu_khoa}}" varProps={varProps} />
      <KVTable title="Header" rows={s.headers} onChange={(headers) => set({ headers })} keyHint="Authorization" valueHint="{{token}}" varProps={varProps}
        help="Tên có token / key / auth / password → 🔒 không hiện trong lời báo lỗi." />
      <Field label="Body" wide group>
        <Segmented value={body} options={BODY_TYPES} full label="Kiểu body"
          onChange={(bodyType: BodyType) => set({ bodyType: bodyType || undefined, body: bodyType === 'json' && !s.body ? '{\n  \n}' : s.body })} />
      </Field>
      {(body === 'json' || body === 'text') && (
        <div className="col-span-2 -mt-1.5 flex flex-col gap-1.5">
          <VarTextInput {...varProps} rows={6} value={s.body ?? ''} onChange={(v) => set({ body: v })}
            placeholder={body === 'json' ? '{\n  "ten": "{{ten}}",\n  "so_luong": 2\n}' : 'nội dung gửi đi'} />
          {body === 'json' && <span className={valid === false ? errText : hint}>
            {valid === false ? 'JSON sai cú pháp – thiếu dấu nháy, dấu phẩy hoặc ngoặc' : 'Biến chữ đặt trong dấu nháy: "{{ten}}"'}
          </span>}
        </div>
      )}
      {body === 'form' && <KVTable title="Trường form" rows={s.form} onChange={(form) => set({ form })} keyHint="email" valueHint="{{email}}" varProps={varProps} />}
      <NumField label="Chờ phản hồi" info="Chờ phản hồi tối đa – quá giờ thì đi cổng Thất bại" step={s} field="timeoutMs" unit="ms" min={1} />
      <div className="col-span-2 flex flex-col gap-1 rounded-card bg-soft px-3 py-2.5 text-xs text-muted">
        <span className="font-semibold text-ink">Đọc kết quả</span>
        <span><span className="font-mono text-ink">{`{{${s.ref}.output.status}}`}</span> mã HTTP · <span className="font-mono text-ink">{`{{${s.ref}.output.json.data.id}}`}</span> đọc sâu JSON (mảng đếm từ 0: <span className="font-mono">items.0</span>)</span>
        <span>Mã 2xx → <span className="text-ok">Thành công</span>; mã khác, mất mạng, hết giờ → <span className="text-danger-text">Thất bại</span> (nhánh này vẫn đọc được status / body).</span>
      </div>
    </>
  );
}
