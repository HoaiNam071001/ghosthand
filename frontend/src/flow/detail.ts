// Dòng chi tiết thẻ node hành động (vị trí / nội dung / cách tìm) – flow/view.ts ghép thêm thời gian chờ sau node.
import { tr } from '../i18n/lang';
import { fmtAxis, fmtPoint, usesVar } from '../anchor';
import { fmtKey } from '../keys';
import { fmtOcrRead, fmtShot } from './shot';
import { fmtWaitScreen } from './waitScreen';
import { countRange } from './findAll';
import { fmtClip } from './clipboard';
import { fmtHTTP } from './http';
import { fmtElementAction } from './elementAction';
import { fmtWaitUIEvent } from './uiEvent';
import { fmtFile, fmtWaitDownload } from './file';
import { fmtOSShortcut } from './osShortcut';
import { fmtShell } from './shell';
import { fmtSystem } from './system';
import { fmtWindow } from './window';
import { fmtApp } from './app';
import { fmtBrowserGo, fmtBrowserNorm, fmtBrowserTab, fmtSavePdf } from './browserTab';
import { fmtWaitUntil } from './waitUntil';
import { fmtPath } from './shape';
import { fmtWebStep, isWebStep } from './web';
import { fmtInputSource } from './inputSource';
import { fmtZip } from './zip';
import { fmtAskAI } from './askAI';
import { fmtMCPTool } from './mcpTool';
import { fmtNotify } from './notify';
import { fmtAskUser } from './askUser';
import { fmtPower } from './power';
import { fmtDisplay } from './display';
import { fmtProcess } from './process';
import { fmtElement, fmtElementRead, fmtPageText, fmtReadDocument, fmtReadTable } from './element';
import { fmtMs, numVarOf, type Step, type StepPoint } from '../types';
import { SCROLL_ARROW, SCROLL_NOTCH_PX } from '../scroll';

const fmtSigned = (v: number) => (v > 0 ? `+${v}` : `${v}`);
const fmtPair = (p: StepPoint) => (usesVar(p) ? `${p.xVar}, ${p.yVar}` : `${fmtAxis(p.x, p.ax)}, ${fmtAxis(p.y, p.ay)}`);
// refOf: id node → mã (n2) để ghi nguồn chỗ thấy của click theo ảnh.
export const fmtPos = (s: Step, refOf: (id: string) => string = () => '?') =>
  s.type === 'drag'
    ? `${s.dragFromPrev ? tr('dtl.fromPrev') : `A ${fmtPair(s.points[0])}`} → ${
      s.dragRelative ? `Δ ${usesVar(s.points[1]) ? fmtPair(s.points[1]) : `${fmtSigned(s.points[1].x)},${fmtSigned(s.points[1].y)}`}` : `B ${fmtPair(s.points[1])}`}`
    : s.type === 'type' ? `"${s.text}"`
    : s.type === 'key' ? fmtKey(s)
    : s.type === 'webKey' ? `${fmtKey(s)}${s.tab ? tr('dtl.tab', { t: s.tab }) : ''}${tr('dtl.appChrome')}`
    : s.type === 'scroll' ? `${SCROLL_ARROW[s.direction ?? 'down']} ${numVarOf(s, 'amount') !== undefined ? tr('dtl.notches', { n: numVarOf(s, 'amount') ?? '' }) // nấc từ biến: chỉ biết lúc chạy
      : tr('dtl.notchPx', { n: s.amount ?? 0, px: (s.amount ?? 0) * SCROLL_NOTCH_PX })} ${s.points[0] ? tr('dtl.atPt', { p: fmtPoint(s.points[0]) }) : tr('dtl.atMouse')}`
    : s.type === 'open' ? `${s.target || '—'}${s.webBrowser ? tr('dtl.appChrome') : s.app ? ` · ${s.app}` : ''}`
    : isWebStep(s.type) ? fmtWebStep(s)
    : s.type === 'screenshot' ? fmtShot(s, refOf)
    : s.type === 'waitScreen' ? fmtWaitScreen(s, refOf)
    : s.type === 'ocrRead' ? fmtOcrRead(s, refOf)
    : s.type === 'clipboard' ? fmtClip(s)
    : s.type === 'http' ? fmtHTTP(s)
    : s.type === 'file' ? fmtFile(s)
    : s.type === 'system' ? fmtSystem(s)
    : s.type === 'shell' ? fmtShell(s)
    : s.type === 'sysInfo' ? (s.filePath?.trim() ? tr('dtl.disk', { d: s.filePath.trim() }) : tr('dtl.sys'))
    : s.type === 'power' ? fmtPower(s)
    : s.type === 'display' ? fmtDisplay(s)
    : s.type === 'notify' ? fmtNotify(s)
    : s.type === 'askUser' ? fmtAskUser(s)
    : s.type === 'askAI' ? fmtAskAI(s)
    : s.type === 'mcpTool' ? fmtMCPTool(s)
    : s.type === 'zip' ? fmtZip(s)
    : s.type === 'inputSource' ? fmtInputSource(s)
    : s.type === 'process' ? fmtProcess(s)
    : s.type === 'osShortcut' ? fmtOSShortcut(s)
    : s.type === 'window' ? fmtWindow(s)
    : s.type === 'app' ? fmtApp(s)
    : s.type === 'browserTab' ? fmtBrowserTab(s, refOf)
    : s.type === 'savePdf' ? fmtSavePdf(s, refOf)
    : s.type === 'browserGo' ? fmtBrowserGo(s, refOf)
    : s.type === 'browserNorm' ? fmtBrowserNorm(s, refOf)
    : s.type === 'waitUntil' ? fmtWaitUntil(s)
    : s.type === 'path' ? fmtPath(s)
    : s.type === 'elementRead' ? fmtElementRead(s)
    : s.type === 'pageText' ? fmtPageText(s)
    : s.type === 'readDocument' ? fmtReadDocument(s)
    : s.type === 'elementAction' ? fmtElementAction(s)
    : s.type === 'waitUIEvent' ? fmtWaitUIEvent(s)
    : s.type === 'waitDownload' ? fmtWaitDownload(s)
    : s.type === 'readTable' ? fmtReadTable(s)
    : s.type === 'waitImage' || s.type === 'findAll' || (s.type === 'clickImage' && s.imageSource === 'search')
      ? `${s.type === 'clickImage' ? tr('dtl.auto') : s.type === 'findAll' ? tr('dtl.places', { n: countRange(s) }) : ''}${s.findBy === 'element' ? fmtElement(s) : s.findBy === 'ai'
        ? (s.findText?.trim() ? tr('dtl.ai', { t: s.findText, m: fmtMs(s.timeoutMs ?? 0) }) : tr('dtl.aiNo'))
        : s.findBy === 'text'
        ? (s.findText?.trim() ? tr('dtl.text', { t: s.findText, o: (s.occurrence ?? 0) > 1 ? tr('dtl.occ', { n: s.occurrence ?? 0 }) : '', m: fmtMs(s.timeoutMs ?? 0) }) : tr('dtl.textNo'))
        : s.template ? tr('dtl.match', { th: s.threshold ?? 0, tags: matchTags(s), m: fmtMs(s.timeoutMs ?? 0) }) : tr('dtl.noTpl')}`
    : s.type === 'clickImage' ? tr('dtl.from', { r: s.imageFrom ? refOf(s.imageFrom) : tr('fx.noNode'), d: s.dx || s.dy ? ` ${fmtSigned(s.dx ?? 0)},${fmtSigned(s.dy ?? 0)}` : '' })
    : s.type === 'waitPixel' && s.points[0] ? tr('dtl.pixel', { p: fmtPoint(s.points[0]), c: s.color ?? '', t: s.tolerance ?? 0, m: fmtMs(s.timeoutMs ?? 0) })
    : s.points[0] ? fmtPoint(s.points[0]) : '—';

// matchTags – cách so ảnh mẫu khác mặc định (bước 40): " · so viền", " · màu ±15%".
export const matchTags = (s: { matchMode?: string; colorTol?: number }) =>
  `${s.matchMode === 'edge' ? tr('dtl.edge') : ''}${s.colorTol ? tr('dtl.colorTol', { n: s.colorTol }) : ''}`;
