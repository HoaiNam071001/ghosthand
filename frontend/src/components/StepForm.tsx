// Inspector – cấu hình node đang chọn (design v3, cột phải), sửa trực tiếp vào store.
// Khung: đầu (màu nhóm, tên, mã node, loại, ⓘ, bật / tắt), tab Node / Input, khối thu gọn Thiết lập → Thời gian → khối flow;
// trường theo loại nằm ở components/stepform/.
import ChangeTypePalette from './palette/ChangeTypePalette';
import { ResizeHandle, usePanelWidth } from './PanelResize';
import { ReactNode, useState } from 'react';
import { Eye } from './icons';
import { Switch } from './Switch';
import { openOverlay } from '../windowMode';
import { toggleStep, updateStep, useScript } from '../store';
import { isControl, numVarOf, STEP_LABEL, Step, stepLabel, StepPoint } from '../types';
import { hint, NumField, TabBtn } from './stepform/shared';
import { InfoButton, iconBtn, InspectorHead, Section } from './stepform/InspectorParts';
import { nodeCategory } from '../flow/category';
import { timingSummary } from '../flow/summary';
import { isMouse, JitterField, MouseFields } from './stepform/MouseFields';
import { ScrollFields } from './stepform/ScrollFields';
import { KeyFields } from './stepform/KeyFields';
import { WebKeyFields } from './stepform/WebKeyFields';
import { OpenFields, TypeFields } from './stepform/TextFields';
import { CapturePermission, ClickImageFields, ImageSearchFields, isImageStep, WaitPixelFields } from './stepform/ImageFields';
import { FindAllFields } from './stepform/FindAllFields';
import { WebFields } from './stepform/WebFields';
import { ShotFields } from './stepform/ShotFields';
import { WaitScreenFields } from './stepform/WaitScreenFields';
import { ClipFields } from './stepform/ClipFields';
import { HttpFields } from './stepform/HttpFields';
import { FileFields } from './stepform/FileFields';
import { SystemFields } from './stepform/SystemFields';
import { AppFields } from './stepform/AppFields';
import { BrowserTabFields } from './stepform/BrowserTabFields';
import { BrowserGoFields } from './stepform/BrowserGoFields';
import { SavePdfFields } from './stepform/SavePdfFields';
import { BrowserNormFields } from './stepform/BrowserNormFields';
import { WindowFields } from './stepform/WindowFields';
import WindowGuardField from './stepform/WindowGuardField';
import ConfirmField from './stepform/ConfirmField';
import { hasWindowGuard } from '../flow/windowGuard';
import { WaitUntilFields } from './stepform/WaitUntilFields';
import { PathFields } from './stepform/PathFields';
import ElementReadFields from './stepform/ElementReadFields';
import PageTextFields from './stepform/PageTextFields';
import ReadDocumentFields from './stepform/ReadDocumentFields';
import ReadTableFields from './stepform/ReadTableFields';
import ElementActionFields from './stepform/ElementActionFields';
import WaitUIEventFields from './stepform/WaitUIEventFields';
import InputSourceFields from './stepform/InputSourceFields';
import ProcessFields from './stepform/ProcessFields';
import ZipFields from './stepform/ZipFields';
import AskAIFields from './stepform/AskAIFields';
import MCPToolFields from './stepform/MCPToolFields';
import NotifyFields from './stepform/NotifyFields';
import PowerFields from './stepform/PowerFields';
import DisplayFields from './stepform/DisplayFields';
import SysInfoFields from './stepform/SysInfoFields';
import OSShortcutFields from './stepform/OSShortcutFields';
import ShellFields from './stepform/ShellFields';
import WaitDownloadFields from './stepform/WaitDownloadFields';
import { isWebStep } from '../flow/web';
import FlowSections from './stepform/FlowSections';
import ControlSection from './stepform/ControlSection';
import InputsTab from './stepform/InputsTab';
import { HumanNodeField } from './HumanFields';
import { usesHuman } from '../flow/human';
import { infoKey, nodeInfo } from '../flow/nodeInfo';
import { openGuide } from '../guideNav';
import PermNotice from './stepform/PermNotice';

// Loại node hành động đổi qua lại được trong ô loại node ở đầu (node điều khiển có trường riêng, không đổi loại)
const REF_RE = /^[A-Za-z][A-Za-z0-9_]{0,31}$/; // khớp validRef (flow.go)

export default function StepForm({ step: s }: { step: Step }) {
  const script = useScript();
  const [tab, setTab] = useState<'step' | 'inputs'>('step');
  const size = usePanelWidth('inspector-width', 340, 300, 640);
  const setPoint = (i: number, p: Partial<StepPoint>) => updateStep(s.id, { points: s.points.map((q, j) => (j === i ? { ...q, ...p } : q)) });
  const atPoint = isMouse(s) || s.type === 'waitPixel' || (s.type === 'scroll' && s.points.length > 0); // có vị trí trên màn hình
  const delay = numVarOf(s, 'delayAfter') ?? s.delayAfter;

  return (
    <div className="relative flex flex-none">
      <ResizeHandle edge="left" width={size.width} onWidth={size.setWidth} onReset={size.reset} label="Bề rộng bảng thuộc tính node" />
      <aside aria-label={`Thuộc tính node ${s.ref}`} style={{ width: size.width }} className="flex flex-col gap-3 overflow-y-auto border-l border-line bg-surface p-3.5">
        <InspectorHead cat={nodeCategory(s)} icon={s.type}
          name={<input value={s.name ?? ''} placeholder={stepLabel(s)} onChange={(e) => updateStep(s.id, { name: e.target.value || undefined })}
            aria-label="Tên node" title="Tên hiện trên thẻ – bỏ trống = tên theo loại"
            className="w-full truncate bg-transparent text-[15px] font-semibold outline-none placeholder:text-ink" />}
          sub={<><RefInput step={s} /><TypeSelect step={s} /></>}
          actions={<>
            <InfoButton info={nodeInfo(s)} onGuide={() => openGuide({ node: infoKey(s) })} />
            {atPoint && (
              <button onClick={() => openOverlay('point', s.id)} aria-label="Xem trên màn hình"
                title="Xem / sửa vị trí riêng node này trên màn hình – các node khác mờ đi" className={iconBtn}><Eye /></button>
            )}
            <Switch on={s.enabled} onChange={() => toggleStep(s.id)} label="Bật node" />
          </>} />

        <div className="flex flex-none gap-4 border-b border-line" role="tablist">
          <TabBtn active={tab === 'step'} onClick={() => setTab('step')}>Node</TabBtn>
          <TabBtn active={tab === 'inputs'} onClick={() => setTab('inputs')} title="Các giá trị hỏi khi bấm Chạy">
            Input {!!script.inputs?.length && <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent-text">{script.inputs.length}</span>}
          </TabBtn>
        </div>

        {tab === 'inputs' ? <InputsTab /> : <>
          <PermNotice step={s} />
          {/* node Chờ: chỉ có thời gian chờ – không hiện khối Thiết lập trống, mở sẵn khối Thời gian */}
          {s.type !== 'wait' && <Section title="Thiết lập" scope={s.type} defaultOpen>
            {isControl(s.type) ? <ControlSection step={s} /> : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <TypeBody step={s} setPoint={setPoint} />
              </div>
            )}
          </Section>}

          {!isControl(s.type) && (
            <Section title="Thời gian" scope={s.type} defaultOpen={s.type === 'wait'} summary={timingSummary(delay, numVarOf(s, 'jitterMs') ?? s.jitterMs)}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <NumField label={s.type === 'wait' ? 'Thời gian chờ' : 'Chờ sau khi xong'} step={s} field="delayAfter" unit="ms" />
                <NumField label="Ngẫu nhiên" step={s} field="jitterMs" unit="ms" prefix="±" />
                <span className={`col-span-2 -mt-1 ${hint}`}>
                  {s.jitterMs > 0
                    ? `Chờ ${Math.max(s.delayAfter - s.jitterMs, 0)}–${s.delayAfter + s.jitterMs} ms${s.type === 'click' && s.clicks > 1 ? ', giữa các click cũng lệch' : ''}`
                    : 'Thời gian chờ cố định (ngẫu nhiên = 0)'}
                  {' '}· chỉ chờ khi node thành công
                </span>
              </div>
            </Section>
          )}

          <FlowSections step={s} />
        </>}
      </aside>
    </div>
  );
}

// Loại node dưới tên (chữ màu nhóm): node hành động bấm vào mở bảng chọn loại (có hoạt hoạ), node điều khiển chỉ hiện chữ.
function TypeSelect({ step: s }: { step: Step }) {
  const [open, setOpen] = useState(false);
  if (isControl(s.type)) return <span className="truncate text-cat">{STEP_LABEL[s.type]}</span>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Loại node" title="Đổi loại node"
        className="inline-flex min-w-0 items-center gap-0.5 rounded px-0.5 text-cat hover:bg-hover">
        <span className="truncate">{stepLabel(s)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="flex-none" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <ChangeTypePalette step={s} onClose={() => setOpen(false)} />}
    </>
  );
}

// Trường riêng theo loại node (trong lưới 2 cột).
function TypeBody({ step: s, setPoint }: { step: Step; setPoint: (i: number, p: Partial<StepPoint>) => void }): ReactNode {
  const script = useScript();
  return (
    <>
      {isMouse(s) && <MouseFields step={s} setPoint={setPoint} />}
      {s.type === 'path' && <PathFields step={s} />}
      {s.type === 'scroll' && <ScrollFields step={s} setPoint={setPoint} />}
      {(isImageStep(s) || s.type === 'screenshot' || s.type === 'waitScreen') && s.findBy !== 'element' && <CapturePermission />}
      {s.type === 'waitImage' && <ImageSearchFields step={s} />}
      {s.type === 'findAll' && <FindAllFields step={s} />}
      {s.type === 'clickImage' && <ClickImageFields step={s} />}
      {s.type === 'waitPixel' && <WaitPixelFields step={s} setPoint={setPoint} />}
      {s.type === 'screenshot' && <ShotFields step={s} />}
      {s.type === 'waitScreen' && <WaitScreenFields step={s} />}
      {s.type === 'clipboard' && <ClipFields step={s} />}
      {s.type === 'http' && <HttpFields step={s} />}
      {s.type === 'file' && <FileFields step={s} />}
      {s.type === 'system' && <SystemFields step={s} />}
      {s.type === 'window' && <WindowFields step={s} />}
      {s.type === 'app' && <AppFields step={s} />}
      {s.type === 'browserTab' && <BrowserTabFields step={s} />}
      {s.type === 'savePdf' && <SavePdfFields step={s} />}
      {s.type === 'browserGo' && <BrowserGoFields step={s} />}
      {s.type === 'browserNorm' && <BrowserNormFields step={s} />}
      {s.type === 'waitUntil' && <WaitUntilFields step={s} />}
      {isWebStep(s.type) && <WebFields step={s} />}
      {s.type === 'elementRead' && <ElementReadFields step={s} />}
      {s.type === 'readDocument' && <ReadDocumentFields step={s} />}
      {s.type === 'pageText' && <PageTextFields step={s} />}
      {s.type === 'elementAction' && <ElementActionFields step={s} />}
      {s.type === 'waitUIEvent' && <WaitUIEventFields step={s} />}
      {s.type === 'inputSource' && <InputSourceFields step={s} />}
      {s.type === 'power' && <PowerFields step={s} />}
      {s.type === 'display' && <DisplayFields step={s} />}
      {s.type === 'notify' && <NotifyFields step={s} />}
      {s.type === 'askAI' && <AskAIFields step={s} />}
      {s.type === 'mcpTool' && <MCPToolFields step={s} />}
      {s.type === 'zip' && <ZipFields step={s} />}
      {s.type === 'process' && <ProcessFields step={s} />}
      {s.type === 'sysInfo' && <SysInfoFields step={s} />}
      {s.type === 'osShortcut' && <OSShortcutFields step={s} />}
      {s.type === 'shell' && <ShellFields step={s} />}
      {s.type === 'waitDownload' && <WaitDownloadFields step={s} />}
      {s.type === 'readTable' && <ReadTableFields step={s} />}
      {s.type === 'open' && <OpenFields step={s} />}
      {s.type === 'type' && <TypeFields step={s} />}
      {s.type === 'key' && <KeyFields step={s} />}
      {s.type === 'webKey' && <WebKeyFields step={s} />}
      {isMouse(s) && <JitterField step={s} />}
      {hasWindowGuard(s.type) && <WindowGuardField step={s} />}
      {s.type !== 'wait' && <ConfirmField step={s} />}
      {usesHuman(s) && <HumanNodeField value={s.human} scriptLevel={script.human} onChange={(human) => updateStep(s.id, { human })} />}
    </>
  );
}

// Mã node (n2): dùng trong biến {{n2.output.x}}. Giữ bản nháp khi gõ, chỉ ghi khi hợp lệ và không trùng.
function RefInput({ step: s }: { step: Step }) {
  const { steps } = useScript();
  const [draft, setDraft] = useState(s.ref);
  const dup = steps.some((x) => x.id !== s.id && x.ref === draft);
  const bad = !REF_RE.test(draft) || draft === 'vars' || draft === 'last';
  return (
    <span className="flex flex-none items-center gap-1.5 text-muted">
      <input value={draft} aria-label="Mã node" spellCheck={false}
        title="Mã node – dùng trong biến {{mã.output.x}}. Chữ cái đầu, sau đó chữ / số / _"
        onChange={(e) => {
          const v = e.target.value.trim();
          setDraft(v);
          if (REF_RE.test(v) && v !== 'vars' && v !== 'last' && !steps.some((x) => x.id !== s.id && x.ref === v)) updateStep(s.id, { ref: v });
        }}
        onBlur={() => setDraft(s.ref)}
        className={`w-12 rounded bg-soft px-1 font-mono outline-none ${dup || bad ? 'text-danger-text' : 'text-ink'}`} />
      {dup ? 'trùng mã node khác' : bad ? 'mã không hợp lệ' : null}
    </span>
  );
}
