// Overlay chọn vùng / điểm – cửa sổ trong suốt phủ màn hình, always-on-top.
// File này giữ state + xử lý chuột / phím; phần vẽ ở components/overlay/, hình học + chữ gợi ý ở overlay/ (thuần).
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MousePos } from '../../wailsjs/go/main/App';
import {
  boundsOf, cancelPick, endpoints, hasPoints, movePoint, pickingPoint, pickingStep, placePoint, placeStroke, placingType, pointKey, refOf,
  regionMapping, RegionMapMode, selectedScreenPoints, selectStep, setDragMode, setFocusLock, setMulti, setRegion,
  setRegionMapped, startPick, transformedSteps, useEditor,
} from '../store';
import { frameRect, MapDialog, modKeyName, paramsPreview, TransformBar, TransformFrame, useTransformGesture } from '../components/TransformTool';
import { bbox, NO_TF, TfParams } from '../transform';
import { Point, Rect } from '../types';
import { inWails, OverlayTool, overlayFocus, overlayTool, setWindowMode } from '../windowMode';
import { toClientPt, toScreenPt } from '../coordMap';
import { scrollRange, useSimulation } from '../components/Simulation';
import SimulationLayer from '../components/simulation/SimulationLayer';
import { branchNodes } from '../flow/preview';
import { chooseBranch, resetBranches, useBranchChoices } from '../previewBranches';
import { PageBackdrop, usePageKind } from '../components/MockPage';
import { captureTargetStep, capturesRect, useImageState } from '../imageSteps';
import { Eye, Region, SelectIcon, StepIcon } from '../components/icons';
import { anchorLinesOf, buildMarkers, MIN_REGION, pathOutlines, rectOf, scrollArrowsOf } from '../overlay/geometry';
import { overlayHint } from '../overlay/hint';
import { windowBoxes } from '../overlay/windowBoxes';
import { WindowBoxes } from '../components/overlay/WindowBoxes';
import { atBarEdge, inBarHold } from '../overlay/toolbarLayout';
import { useAutoHideBar, useBarSide, useCapture, useCoordMap, useDisplays, useFlash, useRefState, useStroke, useViewport } from '../components/overlay/hooks';
import { StrokeLayer } from '../components/overlay/StrokeLayer';
import { CaptureBox, FindBoxes, RegionBox } from '../components/overlay/Shapes';
import { JitterBoxes, MarkerDots, OverlayLines } from '../components/overlay/MarkerLayer';
import { CoordInfo, Crosshair, HintPill } from '../components/overlay/Hud';
import { OverlayToolbar, TOOLS } from '../components/overlay/OverlayToolbar';
import { useOverlayKeys } from '../components/overlay/useOverlayKeys';

const MIN_MOVE = 3; // px – kéo marker ít hơn coi như click (chọn bước)
const EDGE = 12; // px – chuột sát cạnh đặt thanh thì hiện thanh công cụ
const NOTICE_MS = 3500; // thông báo trong gợi ý tự tắt

// Marker đang được kéo: bước, điểm thứ mấy, vị trí bấm xuống (toạ độ cửa sổ), đã kéo đủ xa chưa.
type Moving = { id: string; index: number; from: Point; moved: boolean };

export default function OverlayScreen() {
  const { script, selected, notice, dragA, multi } = useEditor();
  const { region, steps } = script;
  const [picking] = useState(pickingStep); // id bước đang chọn lại điểm (nút ⌖), null = thêm bước mới
  const [tool, setTool] = useState<OverlayTool>(overlayTool);
  const [cursor, setCursor] = useState<Point>({ x: -100, y: -100 });
  const [dragFrom, setDragFrom, dragRef] = useRefState<Point | null>(null); // toạ độ cửa sổ
  const [moving, setMoving, movingRef] = useRefState<Moving | null>(null);
  const { finds } = useImageState();
  const preview = tool === 'preview';
  const [speed, setSpeed] = useState(1);
  const choices = useBranchChoices();
  const { sim, start: startSim, stop: stopSim } = useSimulation(script, region, speed, choices);
  const pageKind = usePageKind();
  const simRef = useRef({ running: false, stop: stopSim });
  simRef.current = { running: sim.running, stop: stopSim };
  // Xem riêng một bước (nút 👁 trong form): bước khác + vùng mờ đi, chỉ sửa được bước này.
  const [focus, setFocus] = useState(overlayFocus);
  const [repicking, setRepicking, repickRef] = useRefState(false); // đang "Chọn lại trên màn hình" trong chế độ xem riêng
  const [alt, setAlt] = useState(false); // giữ Alt: hiện đường neo của mọi điểm
  // Chọn nhiều (bước 30): ô nhập số đang xem trước; vùng mới đang chờ chọn cách xử lý điểm (null = không chờ).
  const [tf, setTf] = useState<TfParams>(NO_TF);
  const [pending, setPending, pendingRef] = useRefState<{ to: Rect | null } | null>(null);
  const [mapMode, setMapMode] = useState<RegionMapMode>('anchor');
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const { displays, current: curDisp, pick: pickDisplay } = useDisplays();
  const { map, sample, cancel: cancelSample } = useCoordMap(curDisp?.rect);
  // "Toàn màn hình" (vùng = nil) là màn chính; ở màn phụ thì nút đặt vùng = cả màn đó.
  const fullRegion: Rect | null = curDisp && !curDisp.main ? curDisp.rect : null;
  const isFull = fullRegion ? !!region && ['x', 'y', 'w', 'h'].every((k) => region[k as keyof Rect] === fullRegion[k as keyof Rect]) : !region;
  const vp = useViewport(); // đổi màn → cửa sổ đổi cỡ → vẽ lại nền theo cỡ mới
  const bar = useAutoHideBar();
  const barSide = useBarSide();
  const noticeOn = useFlash(notice, NOTICE_MS);
  const skipClick = useRef(false); // click sinh ra sau khi thả marker không được tính là đặt điểm
  const cursorRef = useRef(cursor);

  const toScreenFromClient = useCallback((p: Point): Point => toScreenPt(map, p), [map]);
  const toClient = (p: Point): Point => toClientPt(map, p);
  const toClientRect = (r: Rect): Rect => ({ ...toClient(r), w: r.w / map.kx, h: r.h / map.ky });
  const toScreenRect = (r: Rect): Rect => ({ ...toScreenFromClient(r), w: Math.round(r.w * map.kx), h: Math.round(r.h * map.ky) });
  const capture = useCapture(toScreenRect);
  const { cap, setCap, capRef } = capture;
  const stroke = useStroke();
  const gesture = useTransformGesture(toScreenFromClient);
  const gestureRef = useRef(gesture);
  gestureRef.current = gesture;

  useOverlayKeys({
    toolRef, pendingRef, capRef, useCapture: capture.use, gestureRef, simRef, movingRef, dragRef, repickRef,
    clearMoving: () => setMoving(null), clearDrag: () => setDragFrom(null), clearCap: () => setCap(null), endRepick: () => setRepicking(false), setAlt,
    onLeave: cancelSample,
  });

  useEffect(() => setDragMode(tool === 'drag'), [tool]);
  useEffect(() => setTf(NO_TF), [multi.join(), tool]); // đổi lựa chọn → bỏ số đang nhập dở trên thanh biến đổi
  // Chọn lại xong bằng F6 (không qua onClick) → tắt trạng thái "đang chọn lại".
  useEffect(() => {
    if (repickRef.current && pickingStep() === null) setRepicking(false);
  }, [steps, dragA]);
  useEffect(() => {
    setFocusLock(!!focus);
    if (focus) selectStep(focus);
    return () => setFocusLock(false);
  }, [focus]);

  const onUI = (e: MouseEvent) => !!(e.target as HTMLElement).closest('[data-ui]');

  const onMove = (e: MouseEvent) => {
    const c = { x: e.clientX, y: e.clientY };
    setCursor(c);
    // Thanh: mở khi sát mép; đang mở thì giữ khi còn trong dải sát mép hoặc trên thanh / gợi ý, ra ngoài mới hẹn đóng.
    if (e.buttons === 0) {
      const vpNow = { w: window.innerWidth, h: window.innerHeight };
      if (atBarEdge(barSide, c, vpNow, EDGE) || (bar.open && (inBarHold(barSide, c, vpNow) || onUI(e)))) bar.show();
      else if (bar.open) bar.leave();
    }
    cursorRef.current = c;
    if (stroke.active) stroke.add(c);
    const m = movingRef.current;
    if (m && !m.moved && Math.hypot(c.x - m.from.x, c.y - m.from.y) >= MIN_MOVE) setMoving({ ...m, moved: true });
    sample(c, () => cursorRef.current);
  };

  const onDown = (e: MouseEvent) => {
    skipClick.current = false; // bấm ngoài marker (marker chặn sự kiện này)
    if (tool === 'stroke' && !onUI(e) && e.button === 0) return stroke.begin({ x: e.clientX, y: e.clientY });
    if (onUI(e) || e.button !== 0 || (tool !== 'region' && tool !== 'select' && tool !== 'capture') || focus) return; // kéo vùng / khung chọn / khoanh ảnh
    if (tool === 'capture') capture.reset();
    setDragFrom({ x: e.clientX, y: e.clientY });
  };

  const onMarkerDown = (e: MouseEvent, id: string, index: number) => {
    if (e.button !== 0) return;
    e.stopPropagation(); // không bắt đầu kéo vùng
    skipClick.current = true;
    if (tool === 'select') {
      // Shift / ⌘ / Ctrl + click: thêm / bỏ; click điểm chưa chọn: chỉ chọn điểm đó; kéo = di chuyển cả nhóm.
      const key = pointKey(id, index);
      const has = multi.includes(key);
      if (e.shiftKey || e.metaKey || e.ctrlKey) return setMulti(has ? multi.filter((k) => k !== key) : [...multi, key]);
      const sel = has ? multi : [key];
      if (!has) setMulti(sel);
      selectStep(id);
      return gesture.begin(e, 'move', bbox(markers.filter((m) => sel.includes(m.key)).map((m) => m.scr)));
    }
    setMoving({ id, index, from: { x: e.clientX, y: e.clientY }, moved: false });
  };

  // Đặt điểm: lấy vị trí chuột thật từ Go (không phụ thuộc độ lệch đã đo hay chưa).
  const onClick = async (e: MouseEvent) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (onUI(e) || preview) return;
    if (focus ? !repickRef.current : tool === 'region' || tool === 'select' || tool === 'capture' || tool === 'stroke') return; // xem riêng: chỉ đặt điểm khi đang chọn lại
    const screen = inWails ? await MousePos() : toScreenFromClient({ x: e.clientX, y: e.clientY });
    placePoint(screen);
    if (focus) setRepicking(pickingStep() !== null); // kéo thả: còn chờ B thì vẫn đang chọn
  };

  const onUp = async (e: MouseEvent) => {
    if (stroke.active) {
      placeStroke(stroke.end().map(toScreenFromClient)); // quá ngắn / ra ngoài vùng: ở lại để vẽ lại
      return;
    }
    const m = movingRef.current;
    if (m) {
      setMoving(null);
      if (!m.moved) return selectStep(m.id);
      const screen = inWails ? await MousePos() : toScreenFromClient({ x: e.clientX, y: e.clientY });
      movePoint(m.id, m.index, screen);
      return;
    }
    if (!dragFrom) return;
    const r = rectOf(dragFrom, { x: e.clientX, y: e.clientY });
    setDragFrom(null);
    if (tool === 'select') { // khung chọn: chọn các marker nằm trong; Shift / ⌘ cộng thêm; click chỗ trống = bỏ chọn
      const add = e.shiftKey || e.metaKey || e.ctrlKey;
      if (r.w < MIN_REGION && r.h < MIN_REGION) return add || setMulti([]);
      const inside = markers.filter((m) => m.at.x >= r.x && m.at.x <= r.x + r.w && m.at.y >= r.y && m.at.y <= r.y + r.h).map((m) => m.key);
      return setMulti(add ? [...new Set([...multi, ...inside])] : inside);
    }
    if (r.w < MIN_REGION || r.h < MIN_REGION) return;
    if (tool === 'capture') return setCap(r);
    requestRegion(toScreenRect(r));
  };

  // Đổi vùng khi đã có điểm: hỏi cách xử lý các điểm (giữ neo / co giãn / giữ chỗ), xem trước trên overlay.
  const requestRegion = (to: Rect | null) => {
    if (!hasPoints()) return setRegion(to);
    setMapMode('anchor');
    setPending({ to });
  };

  // Vùng hiển thị: đang kéo → vùng tạm; chờ chọn cách đổi vùng → vùng mới; đã chọn → đổi sang toạ độ cửa sổ;
  // null = toàn màn hình (không vẽ). Khung chọn nhiều (tool select) không phải vùng.
  const shownRegion = pending ? pending.to : region;
  const regionDrag = dragFrom && tool === 'region' ? dragFrom : null;
  const shown = regionDrag ? rectOf(regionDrag, cursor) : shownRegion && toClientRect(shownRegion);
  // Nhãn kích thước vùng theo toạ độ thật (robotgo), không phải px trong cửa sổ.
  const shownSize = regionDrag && shown ? { w: Math.round(shown.w * map.kx), h: Math.round(shown.h * map.ky) } : shownRegion;
  // Đang kéo vùng mới: marker tính theo vùng tạm để thấy ngay điểm bám theo góc nó neo.
  const liveRegion = regionDrag && shown && shown.w >= MIN_REGION && shown.h >= MIN_REGION ? toScreenRect(shown) : shownRegion;
  // Xem trước bằng đúng logic ghi thật: chờ đổi vùng → điểm theo cách đang chọn; đang kéo khung / nhập số → điểm sau biến đổi.
  const selScreen = selectedScreenPoints();
  const liveMat = tool === 'select' && !pending ? gesture.live ?? paramsPreview(tf, [...selScreen.values()]) : null;
  const view = pending ? regionMapping(pending.to, mapMode) : liveMat ? transformedSteps(liveMat) : { steps, outside: 0 };
  const ends = endpoints({ ...script, steps: view.steps }, liveRegion);
  const markers = buildMarkers(view.steps, ends, toClient, pointKey, moving?.moved ? moving : null, cursor);
  const selPoints = markers.filter((m) => multi.includes(m.key)).map((m) => m.scr);
  const selBox = selPoints.length ? bbox(selPoints) : null;
  // Đường neo: bước đang chọn / xem riêng, giữ Alt thì mọi điểm.
  const anchorLines = preview ? [] : anchorLinesOf(markers.filter((m) => alt || m.id === (focus ?? selected)),
    (id) => toClientRect(boundsOf(liveRegion, view.steps.find((s) => s.id === id))));
  const scrollArrows = preview ? [] : scrollArrowsOf(view.steps, ends, toClient, { w: window.innerWidth, h: window.innerHeight });
  const focusStep = focus ? steps.find((x) => x.id === focus) ?? null : null;
  // Khung đích node Cửa sổ; Xem trước: chỉ khung của node đang diễn. Trình duyệt (không có Displays): màn chính.
  const winBoxes = windowBoxes(steps, displays.length ? displays : [{ rect: boundsOf(null), work: boundsOf(null), current: true }])
    .filter((b) => !preview || b.id === sim.step);

  // Khoanh ảnh: khung đang kéo hoặc đã kéo xong.
  const capRect = tool === 'capture' && !focus ? (dragFrom ? rectOf(dragFrom, cursor) : cap) : null;
  const capShown = capRect && !(capRect.w < 2 && capRect.h < 2) ? capRect : null;

  const captureStep = captureTargetStep();
  const hint = overlayHint({
    focusStep, repicking, dragA: !!dragA, tool, captured: !!cap, captureRef: captureStep ? refOf(captureStep) : null, captureRect: capturesRect(),
    selected: multi.length, picking: !!picking, placing: placingType(), modKey: modKeyName, pickingElement: pickingPoint(),
  });
  const hintIcon = preview ? <Eye className="h-3 w-3" /> : tool === 'region' && !focus ? <Region className="h-3 w-3" />
    : tool === 'select' && !focus ? <SelectIcon className="h-3 w-3" />
    : <StepIcon type={tool === 'drag' || focusStep?.type === 'drag' ? 'drag' : 'click'} className="h-3 w-3" />;
  const toolName = focusStep ? `Node ${focusStep.ref}` : preview ? 'Xem trước' : tool === 'stroke' ? 'Vẽ đường' : TOOLS.find((t) => t.id === tool)?.label ?? '';
  const exitFocus = () => {
    cancelPick();
    setRepicking(false);
  };

  return (
    // HUD luôn tối (design v2): data-theme="dark" cho mọi token bên trong
    <div data-theme="dark" className={`fixed inset-0 select-none text-ink ${focus ? 'bg-[rgb(14_16_22/.65)]' : 'bg-dim'} ${preview ? '' : 'cursor-crosshair'}`}
      onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp} onClick={onClick}
      // macOS: overlay nằm dưới menu bar – rê nhanh lên trên có thể vượt mép mà không qua vùng TOP_EDGE
      onMouseLeave={(e) => e.buttons === 0 && atBarEdge(barSide, { x: e.clientX, y: e.clientY }, { w: window.innerWidth, h: window.innerHeight }, EDGE * 3) && bar.show()}>
      {/* nền trang mẫu (đúng tỷ lệ px thật) trong vùng / màn hình, trượt theo các bước cuộn */}
      {preview && <PageBackdrop kind={pageKind} rect={region ? toClientRect(region) : { x: 0, y: 0, w: vp.w, h: vp.h }} s={1 / map.kx} offset={sim.offset} range={scrollRange(steps)} />}
      {!preview && <FindBoxes steps={steps} finds={finds} focus={focus} toClient={toClient} />}
      {capShown && (
        <CaptureBox forRect={capturesRect()} rect={capShown} size={toScreenRect(capShown)} confirmed={!!cap && !dragFrom} busy={capture.busy} err={capture.err}
          onUse={capture.use} onRedo={capture.reset} />
      )}
      {shown && <RegionBox rect={shown} size={shownSize} dim={!!focus} />}
      <WindowBoxes boxes={winBoxes} toClientRect={toClientRect} focus={focus} selected={preview ? sim.step : selected} />

      <OverlayLines anchorLines={anchorLines} scrollArrows={scrollArrows} markers={markers} dragA={dragA && toClient(dragA)} cursor={cursor} focus={focus}
        paths={preview ? [] : pathOutlines(view.steps, ends, toClient)} />
      <JitterBoxes markers={markers} scale={{ x: 1 / map.kx, y: 1 / map.ky }} focus={focus} />

      {/* Chọn nhiều: khung biến đổi quanh các điểm đã chọn (theo vị trí đang xem trước) + khung kéo chọn */}
      {tool === 'select' && !pending && selBox && (
        <TransformFrame box={selBox} toClient={toClient} bad={view.outside > 0} single={selPoints.length < 2 || (selBox.w < 1 && selBox.h < 1)}
          begin={(e, kind, _box, fx, fy) => gesture.begin(e, kind, bbox([...selScreen.values()]), fx, fy)} />
      )}
      {tool === 'select' && dragFrom && (
        <div className="pointer-events-none absolute border border-accent bg-accent/10" style={(({ x, y, w, h }) => ({ left: x, top: y, width: w, height: h }))(rectOf(dragFrom, cursor))} />
      )}

      <MarkerDots markers={markers} selectMode={tool === 'select'} multi={multi} preview={preview} focus={focus} selected={selected}
        grabbing={!!moving} dragA={dragA && toClient(dragA)} onDown={onMarkerDown} />

      {preview && <SimulationLayer sim={sim} toClient={toClient} />}
      {tool === 'stroke' && <StrokeLayer pts={stroke.pts} />}
      <Crosshair at={cursor} screen={toScreenFromClient(cursor)} hidden={preview} />

      <HintPill side={barSide} barOpen={bar.open} onEnter={bar.show} onLeave={bar.leave} icon={hintIcon} title={toolName} hint={hint}
        extra={preview && (sim.route || sim.label) ? [sim.route, sim.label].filter(Boolean).join('  ·  ') : undefined}
        notice={noticeOn ? notice : undefined} />
      <CoordInfo region={region} displays={displays} current={curDisp} focusStep={focusStep} focusEnds={focus ? ends.get(focus) : undefined}
        map={inWails ? map : null} />
      <OverlayToolbar side={barSide} open={bar.open} onEnter={bar.show} onLeave={bar.leave} onDone={() => setWindowMode('main')}
        focusStep={focusStep} repicking={repicking}
        onToggleRepick={() => { if (repicking) exitFocus(); else if (focus) { startPick(focus); setRepicking(true); } }}
        onShowAll={() => { exitFocus(); setFocus(null); setTool('point'); }}
        preview={preview} simRunning={sim.running} onToggleSim={() => (sim.running ? stopSim() : startSim())} speed={speed} setSpeed={setSpeed}
        onEditPoints={() => { stopSim(); setTool('select'); }}
        branches={preview ? branchNodes(script) : []} choices={choices} onChooseBranch={chooseBranch} onResetBranches={resetBranches}
        tool={tool} setTool={setTool} fullRegion={isFull ? null : { label: fullRegion ? 'Toàn màn này' : 'Toàn màn hình', onClick: () => requestRegion(fullRegion) }}
        displays={displays} onPickDisplay={pickDisplay} />

      {tool === 'select' && !pending && selScreen.size > 0 && <TransformBar points={selScreen} tf={tf} setTf={setTf}
        frame={frameRect(bbox([...selScreen.values()]), toClient)} />}
      {pending && (
        <MapDialog from={boundsOf(region)} to={boundsOf(pending.to)} target={pending.to} mode={mapMode} setMode={setMapMode}
          onApply={() => { setRegionMapped(pending.to, mapMode); setPending(null); }}
          onCancel={() => setPending(null)} />
      )}
    </div>
  );
}
