// Node chờ ảnh / chữ, click theo ảnh / chữ, chờ màu pixel (bước 25, 25e): ảnh mẫu / chữ, thử tìm, nguồn chỗ thấy, màu.
import Select from '../Select';
import { useEffect, useState } from 'react';
import NumInput, { fieldBox } from '../NumInput';
import Segmented from '../Segmented';
import { Switch } from '../Switch';
import VarTextInput from '../inputs/VarTextInput';
import AnchorField from '../steps/AnchorField';
import { setAnchor, updateStep, useScript } from '../../store';
import { findsImage } from '../../flow/model';
import { addInput } from '../../scriptInputs';
import { checkCapture, pickColor, requestCapture, startCapture, templateUrl, testFind, useImageState } from '../../imageSteps';
import { openOverlay } from '../../windowMode';
import { nodeTitle } from '../../flow/view';
import { Step } from '../../types';
import { ButtonField, errText, Field, fmtSec, hint, NumField, PickButton, selectBox, SetPoint, SwitchField, useNodeVars, varHint } from './shared';
import { ElementSearchFields } from './ElementFields';
import PointSource from './PointSource';
import { FindAllResult } from './FindAllResult';
import MatchFields from './MatchFields';
import AISearchFields from './AISearchFields';
import { usesVar } from '../../anchor';

export const isImageStep = (s: Step) => s.type === 'waitImage' || s.type === 'clickImage' || s.type === 'waitPixel' || s.type === 'findAll';

export // macOS: chưa có quyền ghi màn hình thì chụp chỉ ra hình nền – báo ngay trong inspector.
function CapturePermission() {
  const { allowed } = useImageState();
  useEffect(() => {
    checkCapture();
  }, []);
  if (allowed !== false) return null;
  return (
    <div className="col-span-2 flex flex-col gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger-text">
      Chưa có quyền ghi màn hình (Screen Recording) – app không chụp được màn hình để tìm ảnh / đọc màu.
      <span>System Settings → Privacy &amp; Security → Screen Recording → bật cho app (khi dev: terminal / VS Code), rồi mở lại app.</span>
      <button onClick={requestCapture} className="self-start rounded-control border border-danger/40 px-2.5 py-1 font-semibold hover:bg-danger/10">Xin quyền</button>
    </div>
  );
}


const FIND_OPTIONS: { id: 'image' | 'text' | 'element' | 'ai'; label: string }[] = [{ id: 'image', label: 'Ảnh mẫu' }, { id: 'text', label: 'Chữ' }, { id: 'element', label: 'Phần tử' }];
const FIND_NAME: Record<string, string> = { image: 'ảnh mẫu', text: 'chữ', element: 'phần tử', ai: 'phần tử (AI)' };
const FIND_BY_HELP: Record<string, string> = {
  image: 'So từng điểm ảnh – dùng cho icon, nút không có chữ. Nút có chữ nên chọn “Chữ” hoặc “Phần tử”.',
  text: 'Đọc chữ trên màn hình (OCR) – không bị ảnh hưởng bởi theme sáng / tối, zoom, đổi màu khi rê chuột. Dùng khi nút / nhãn có chữ.',
  ai: 'Mô tả bằng lời, AI nhìn ảnh vùng tìm và chỉ ra chỗ – chậm, tốn tiền, dự phòng khi ảnh mẫu / chữ / phần tử không tìm được.',
  element: 'Tìm qua Accessibility (macOS) / UI Automation (Windows) – chữ / nhãn / vai trò phần tử, chính xác hơn đọc chữ, có cả nút chỉ có icon. Dùng được với Chrome thường đã đăng nhập và app khác; cửa sổ phải đang hiện trên màn.',
};

export // Ảnh mẫu (hoặc chữ / phần tử) + thử tìm + độ khớp / chờ tối đa / vùng tìm – dùng cho Chờ ảnh và Click theo ảnh (tự tìm).
function ImageSearchFields({ step: s }: { step: Step }) {
  const { finds, busy, error } = useImageState();
  const find = finds[s.id];
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const k = s.templateScale || 1;
  const byText = s.findBy === 'text';
  const byElem = s.findBy === 'element';
  const byAI = s.findBy === 'ai';
  return (
    <>
      <Field label="Tìm theo" wide group help={FIND_BY_HELP[s.findBy || 'image']}>
        <Segmented value={s.findBy || 'image'} full label="Tìm theo"
          onChange={(v) => updateStep(s.id, { findBy: v === 'image' ? undefined : v, ...(v === 'element' && !s.selectors?.length ? { selectors: ['text='] } : {}) })}
          options={s.type === 'findAll' ? FIND_OPTIONS : [...FIND_OPTIONS, { id: 'ai', label: 'AI' }]} />
      </Field>
      {byAI ? <AISearchFields step={s} /> : byElem ? <ElementSearchFields step={s} /> : byText ? <TextSearchFields step={s} /> : <Field label="Ảnh mẫu" wide group>
        <div className="relative grid min-h-[92px] place-items-center overflow-hidden rounded-card border border-line bg-soft p-2 text-[13px]">
          {s.template ? (
            <>
              <img src={templateUrl(s.template)} alt="Ảnh mẫu" className="max-h-[140px] max-w-full object-contain"
                style={size ? { width: Math.min(size.w / k, 300) } : undefined}
                onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
              {size && (
                <span className="absolute right-1.5 bottom-1.5 rounded bg-hud/80 px-1.5 font-mono text-[11px] text-hud-text">
                  {Math.round(size.w / k)} × {Math.round(size.h / k)}
                </span>
              )}
            </>
          ) : 'Chưa có ảnh mẫu – bấm “Khoanh ảnh mẫu”, kéo khung quanh nút / chữ cần chờ'}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => startCapture(s.id)} className="h-8 flex-1 rounded-control border border-line bg-surface text-ink hover:bg-hover">
            {s.template ? 'Khoanh lại' : 'Khoanh ảnh mẫu'}
          </button>
          <button onClick={() => testFind(s.id)} disabled={!s.template || busy === s.id}
            title="Tìm ảnh mẫu trên màn hình hiện tại (app ẩn đi một chút) – để biết độ khớp thực tế"
            className="h-8 flex-1 rounded-control border border-line bg-surface text-ink enabled:hover:bg-hover disabled:opacity-50">
            {busy === s.id ? 'Đang tìm…' : 'Thử tìm'}
          </button>
        </div>
        {find && s.type === 'findAll' ? <FindAllResult step={s} find={find} /> : find && (
          <span className={`flex flex-wrap items-center gap-x-2 text-xs ${find.found ? 'text-ok' : 'text-warn'}`}>
            {find.found
              ? <>Thấy tại X {find.x + Math.round(find.w / 2)} Y {find.y + Math.round(find.h / 2)} · khớp {find.score}%{s.colorTol ? ` · lệch màu ${find.colorDiff ?? 0}%` : ''} · {find.ms} ms</>
              : s.colorTol && find.score >= (s.threshold ?? 0)
                ? <>Thấy hình giống (khớp {find.score}%) nhưng màu lệch {find.colorDiff}% (cho phép {s.colorTol}%)</>
              : find.fromRun
                ? <>Lần chạy trước hết giờ không thấy – chỗ giống nhất khớp {find.score}% (cần {s.threshold}%)</>
                : <>Không thấy trên màn hình hiện tại – khớp nhất {find.score}% (cần {s.threshold}%)</>}
            <button onClick={() => openOverlay('point', s.id)} className="text-muted underline">xem trên màn hình</button>
          </span>
        )}
        {error && busy === '' && <span className={errText}>{error}</span>}
      </Field>}
      {!byText && !byElem && !byAI && <NumField label="Độ khớp tối thiểu" info="Ảnh khoanh đúng thường khớp 95–100%; nên để 80–90% và bấm Thử tìm để xem độ khớp thật" step={s} field="threshold" unit="%" min={1} />}
      {!byText && !byElem && !byAI && <MatchFields value={s} onChange={(p) => updateStep(s.id, p)} />}
      <NumField label="Chờ tối đa" info={`Không thấy sau ${fmtSec(s.timeoutMs)} → cổng Thất bại`} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label="Kiểm tra mỗi">
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      {!byText && !byElem && !byAI && (s.threshold ?? 0) < 70 && (
        <span className="col-span-2 -mt-1 text-xs text-warn">
          Độ khớp {s.threshold}% rất thấp – gần như chỗ nào cũng “khớp”, dễ click nhầm. Ảnh khoanh đúng thường khớp 95–100%;
          nên để 80–90% và bấm Thử tìm để xem độ khớp thật.
        </span>
      )}
      <Field label="Tìm trong" wide group help={(byElem ? 'Vùng của kịch bản: chỉ lấy phần tử có tâm trong vùng. Cả màn hình: tìm khắp cửa sổ app (kể cả màn phụ).'
        : byText ? 'Vùng nhỏ đọc nhanh hơn (cả màn ~1 s mỗi lần) và ít nhầm chữ trùng ở chỗ khác.'
        : 'Vùng nhỏ tìm nhanh hơn và ít nhầm hơn. Ảnh mẫu chụp ở màn Retina vẫn tìm được trên màn thường.') + (byElem ? '' : ' Cả màn hình = cả màn chứa vùng.')}>
        <Segmented value={s.searchArea ?? 'region'} onChange={(v) => updateStep(s.id, { searchArea: v === 'screen' ? 'screen' : undefined })} full
          options={[{ id: 'region', label: 'Vùng của kịch bản' }, { id: 'screen', label: 'Cả màn hình' }]} />
      </Field>
    </>
  );
}


// Tìm theo chữ: ô chữ (nhận {{biến}}), cách so, chỗ thứ mấy, thử tìm. Dùng lại cho nhãn của Đọc phần tử (37 E4).
export function TextSearchFields({ step: s, label = 'Chữ cần tìm', placeholder = 'Xem lịch sử' }: { step: Step; label?: string; placeholder?: string }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const { finds, busy, error } = useImageState();
  const find = finds[s.id];
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const empty = !s.findText?.trim();
  return (
    <>
    <Field label={label} wide group side={varHint} help="Không phân biệt hoa / thường, bỏ qua khoảng trắng. Click vào giữa chữ.">
      <VarTextInput value={s.findText ?? ''} onChange={(findText) => set({ findText })} inputs={script.inputs ?? []} nodeVars={nodeVars}
        placeholder={placeholder} onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} />
      {empty && <span className={errText}>Chưa nhập chữ – chạy sẽ báo lỗi</span>}
    </Field>
    <SwitchField label="Cả dòng" help="Chỉ khớp ô / nút chỉ có đúng chữ này (tránh khớp trong câu dài)" on={!!s.textExact} onChange={(textExact) => set({ textExact: textExact || undefined })} />
    <SwitchField label="Bỏ qua dấu" help="Tắt nếu cần phân biệt dấu (vd “đá” với “đã”)" on={!s.textAccent} onChange={(v) => set({ textAccent: v ? undefined : true })} />
    {s.type !== 'findAll' && <Field label="Chỗ thứ" help="Chữ hiện nhiều lần → chỗ thứ mấy tính từ trên xuống, trái sang phải">
      <NumInput value={Math.max(s.occurrence ?? 1, 1)} min={1} stepper onChange={(n) => set({ occurrence: n > 1 ? n : undefined })} />
    </Field>}
    <div className="col-span-2 flex flex-col gap-1.5 text-muted">
      <button onClick={() => testFind(s.id)} disabled={empty || busy === s.id}
        title="Đọc chữ trên màn hình hiện tại và tìm (app ẩn đi một chút)"
        className="h-8 rounded-control border border-line bg-surface text-ink enabled:hover:bg-hover disabled:opacity-50">
        {busy === s.id ? 'Đang đọc chữ…' : 'Thử tìm'}
      </button>
      {find && s.type === 'findAll' ? <FindAllResult step={s} find={find} /> : find && (
        <span className={`flex flex-col gap-1 text-xs ${find.found ? 'text-ok' : 'text-warn'}`}>
          <span className="flex flex-wrap items-center gap-x-2">
            {find.found ? <>Thấy tại X {find.x + Math.round(find.w / 2)} Y {find.y + Math.round(find.h / 2)} · {find.ms} ms</>
              : find.fromRun ? <>Lần chạy trước hết giờ không thấy chữ này</>
              : <>Không thấy trên màn hình hiện tại{find.ms ? ` · ${find.ms} ms` : ''}</>}
            {find.found && <button onClick={() => openOverlay('point', s.id)} className="text-muted underline">xem trên màn hình</button>}
          </span>
          {!find.found && (
            <span className="text-muted">
              {find.read?.length ? <>Đọc được: {find.read.slice(0, 12).map((t, i) => (
                <button key={i} onClick={() => set({ findText: t })} title="Dùng chữ này"
                  className="mr-1 mb-1 inline-block rounded border border-line px-1.5 text-ink hover:bg-hover">{t}</button>
              ))}</> : 'Không đọc được chữ nào trong vùng tìm.'}
            </span>
          )}
        </span>
      )}
      {error && busy === '' && <span className="text-xs text-danger-text">{error}</span>}
    </div>
    </>
  );
}


// Click theo ảnh / chữ: chỗ một node chờ ảnh / chữ đã thấy (chọn node nguồn), hoặc tự tìm.
export function ClickImageFields({ step: s }: { step: Step }) {
  const { steps } = useScript();
  const sources = steps.filter((x) => x.id !== s.id && findsImage(x));
  const src = sources.find((x) => x.id === s.imageFrom);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const byNode = s.imageSource !== 'search';
  return (
    <>
      <Field label="Click vào" wide group>
        <Segmented value={byNode ? 'node' : 'search'} onChange={(imageSource: 'node' | 'search') => set({ imageSource })} full
          options={[{ id: 'node', label: 'Chỗ node khác thấy' }, { id: 'search', label: 'Tự tìm' }]} label="Click vào" />
        {byNode && (
          <Select value={src ? src.id : ''} onChange={(v) => set({ imageFrom: v || undefined })} aria-label="Node lấy chỗ thấy"
            className={`${selectBox} ${src ? '' : 'border-danger'}`} placeholder="— chọn node tìm ảnh / chữ —"
            options={sources.map((x) => ({ value: x.id, label: `${x.ref} · ${nodeTitle(x)}` }))} />
        )}
        <span className={`text-xs ${byNode && !src ? 'text-danger-text' : 'text-muted'}`}>
          {!byNode ? `Tự tìm ${FIND_NAME[s.findBy || 'image']} lúc chạy (chờ như Chờ ${FIND_NAME[s.findBy || 'image']}) rồi click vào giữa`
            : src ? `Click vào chỗ ${src.ref} thấy lần gần nhất trong vòng – ${src.ref} chưa thấy (chưa chạy / thất bại) thì node này thất bại`
            : sources.length ? 'Chọn node tìm ảnh / chữ để lấy chỗ thấy' : 'Chưa có node Chờ ảnh / Chờ chữ nào – thêm một node, hoặc chọn “Tự tìm”'}
        </span>
      </Field>
      {!byNode && <ImageSearchFields step={s} />}
      <Field label={`Lệch so với tâm ${!byNode && s.findBy ? FIND_NAME[s.findBy] : 'chỗ thấy'}`} wide group help="Vd tìm nhãn “Họ tên”, ô nhập nằm bên phải 150 px → ΔX 150.">
        <div className="flex gap-2">
          <NumInput signed prefix="ΔX" value={s.dx ?? 0} onChange={(dx) => set({ dx })} className="flex-1" />
          <NumInput signed prefix="ΔY" value={s.dy ?? 0} onChange={(dy) => set({ dy })} className="flex-1" />
        </div>
      </Field>
      <ButtonField step={s} />
    </>
  );
}

export function WaitPixelFields({ step: s, setPoint }: { step: Step; setPoint: SetPoint }) {
  const { region } = useScript();
  const { busy, error } = useImageState();
  const valid = /^#[0-9a-fA-F]{6}$/.test(s.color ?? '');
  return (
    <>
      {s.points[0] && (
        <PointSource step={s} index={0} setPoint={setPoint} label="Điểm">
          {(menu) => <AnchorField value={s.points[0]} onChange={(p) => setPoint(0, p)} onAnchor={(ax, ay) => setAnchor(s.id, 0, ax, ay)}
            pick={<PickButton step={s} />} menu={menu} />}
        </PointSource>
      )}
      <Field label="Màu cần chờ" wide group>
        <div className="flex gap-2">
          <span className={`${fieldBox} flex-1 gap-2 ${valid ? '' : 'border-danger'}`}>
            <span className="h-4 w-4 flex-none rounded border border-line" style={{ background: valid ? s.color : 'transparent' }} />
            <input value={s.color ?? ''} onChange={(e) => updateStep(s.id, { color: e.target.value.trim() })} spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none" />
          </span>
          <button onClick={() => pickColor(s.id)} disabled={busy === s.id || (!!s.points[0] && usesVar(s.points[0]))}
            title="Lấy màu đang hiện tại điểm này trên màn hình (app ẩn đi một chút) – mở sẵn màn hình có màu cần chờ"
            className="h-8 rounded-control border border-line px-2.5 text-[13px] whitespace-nowrap text-ink enabled:hover:bg-hover disabled:opacity-50">
            {busy === s.id ? 'Đang lấy…' : 'Lấy màu'}
          </button>
        </div>
        {!valid && <span className="text-xs text-danger-text">Màu dạng #RRGGBB, vd #1877F2</span>}
        {error && busy === '' && <span className="text-xs text-danger-text">{error}</span>}
      </Field>
      <Field label="Sai số màu" help={`Mỗi ${s.intervalMs ?? 100} ms đọc màu tại điểm${region ? ' (trong vùng)' : ''}, mỗi kênh R / G / B lệch ≤ ${s.tolerance ?? 0} là được. Không di chuột.`}>
        <NumInput prefix="±" value={s.tolerance ?? 0} onChange={(tolerance) => updateStep(s.id, { tolerance: Math.min(tolerance, 255) })} />
      </Field>
      <NumField label="Chờ tối đa" info={`Không đổi màu sau ${fmtSec(s.timeoutMs)} → cổng Thất bại`} step={s} field="timeoutMs" unit="ms" min={1} />
    </>
  );
}
