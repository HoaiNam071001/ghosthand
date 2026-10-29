// Tìm bằng AI (bước 31d) cho Chờ ảnh / Click theo ảnh: mô tả phần tử bằng lời, AI vision tìm trong ảnh vùng tìm.
// Dùng nhà cung cấp AI mặc định ở Cài đặt → Hỏi AI.
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { testFind, useImageState } from '../../imageSteps';
import { openSettings } from '../../settingsNav';
import { Step } from '../../types';
import { errText, Field, hint, useNodeVars, varHint } from './shared';

export default function AISearchFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const { finds, busy, error } = useImageState();
  const find = finds[s.id];
  const empty = !s.findText?.trim();
  return (
    <>
      <Field label="Mô tả" wide group side={varHint} help="Nói như với người: “nút Gửi màu xanh”, “ô tìm kiếm ở góc trên”. Chỉ nên dùng khi ảnh mẫu / chữ / phần tử không tìm được.">
        <VarTextInput value={s.findText ?? ''} onChange={(findText) => updateStep(s.id, { findText })} inputs={script.inputs ?? []} nodeVars={nodeVars}
          placeholder="nút Gửi" onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} />
        {empty && <span className={errText}>Chưa mô tả – chạy sẽ báo lỗi</span>}
      </Field>
      <div className="col-span-2 flex flex-col gap-1.5">
        <button onClick={() => testFind(s.id)} disabled={empty || busy === s.id}
          title="Chụp vùng tìm và hỏi AI một lần (app ẩn đi một chút)"
          className="h-8 rounded-control border border-line bg-surface text-ink enabled:hover:bg-hover disabled:opacity-50">
          {busy === s.id ? 'Đang hỏi AI…' : 'Thử tìm'}
        </button>
        {find && (
          <span className={`text-xs ${find.found ? 'text-ok' : 'text-warn'}`}>
            {find.found ? <>AI thấy tại X {find.x + Math.round(find.w / 2)} Y {find.y + Math.round(find.h / 2)} · {find.ms} ms</> : <>AI không thấy trên màn hình hiện tại · {find.ms} ms</>}
          </span>
        )}
        {error && busy === '' && <span className={errText}>{error}</span>}
        <span className={hint}>
          Ảnh của vùng tìm gửi cho nhà cung cấp AI mặc định (trừ AI chạy trên máy) và mỗi lần kiểm tra tốn một lần gọi – tối thiểu cách nhau 3 giây.{' '}
          <button className="underline" onClick={() => openSettings('askai')}>Mở Cài đặt → Hỏi AI</button>
        </span>
      </div>
    </>
  );
}
