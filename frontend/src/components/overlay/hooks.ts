// Hook nhỏ của overlay.
import { appChoices, WindowChoice } from '../../overlay/windowChoices';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Displays, FocusWindow, GetSettings, ListWindows, MousePos, SetOverlayDisplay } from '../../../wailsjs/go/main/App';
import { main } from '../../../wailsjs/go/models';
import { inWails } from '../../windowMode';
import { applyCapture } from '../../imageSteps';
import { Point, Rect } from '../../types';
import { BarSide, toBarSide } from '../../overlay/toolbarLayout';
import { addSample, currentMapping, setDisplay } from '../../coordMap';

const BAR_HIDE_MS = 350; // rời thanh / gợi ý bao lâu thì ẩn
const BAR_INTRO_MS = 2500; // mở overlay: hiện thanh một lúc cho dễ thấy
const CALIBRATE_MS = 150; // chuột đứng yên bao lâu thì lấy mẫu kiểm tra toạ độ (coordMap.ts)

// State kèm ref luôn mới nhất – cho listener phím gắn một lần (useEffect []) đọc được giá trị hiện tại.
export function useRefState<T>(init: T) {
  const [value, setValue] = useState(init);
  const ref = useRef(value);
  const set = useCallback((v: T) => {
    ref.current = v;
    setValue(() => v);
  }, []);
  return [value, set, ref] as const;
}

// Thanh công cụ tự ẩn: mở khi chuột sát mép / rê vào gợi ý, đóng khi rời. Lúc mở overlay hiện một lúc.
// leave gọi liên tục khi rê chuột ngoài thanh → hẹn đóng đang chờ thì giữ hẹn cũ (đặt lại thì không bao giờ đóng).
export function useAutoHideBar() {
  const [open, setOpen] = useState(true);
  const timer = useRef<number | undefined>(undefined);
  const hideIn = (ms: number) => {
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setOpen(false);
    }, ms);
  };
  const show = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setOpen(true);
  }, []);
  const leave = useCallback(() => {
    if (timer.current === undefined) hideIn(BAR_HIDE_MS);
  }, []);
  useEffect(() => {
    hideIn(BAR_INTRO_MS);
    return () => clearTimeout(timer.current);
  }, []);
  return { open, show, leave };
}

// Cạnh đặt thanh công cụ (Cài đặt → Chọn vùng); đọc lúc mở overlay.
export function useBarSide() {
  const [side, setSide] = useState<BarSide>('top');
  useEffect(() => { if (inWails) GetSettings().then((s) => setSide(toBarSide(s.overlay?.toolbar))).catch(() => {}); }, []);
  return side;
}

// Cỡ vùng nhìn thấy của overlay – đổi khi chuyển sang màn hình khác (cửa sổ đổi cỡ theo màn).
export function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

// true trong ms sau mỗi lần value đổi (khác rỗng) – thông báo hiện vài giây rồi tắt.
export function useFlash(value: string, ms: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!value) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [value]);
  return on;
}

// Nhiều màn hình: chọn màn cho overlay (Go dời cửa sổ, phủ cả màn mới, nhớ lựa chọn cho lần mở sau).
export function useDisplays() {
  const [displays, setDisplays] = useState<main.DisplayInfo[]>([]);
  const load = () => { if (inWails) Displays().then(setDisplays).catch(() => {}); };
  useEffect(load, []);
  const current = displays.find((d) => d.current);
  const pick = async (i: number) => {
    if (current?.index === i) return;
    try {
      await SetOverlayDisplay(i);
    } catch {
      return;
    }
    load();
  };
  return { displays, current, pick };
}

// App đang mở để nhảy tới (macOS: app toàn màn hình ở Space riêng – overlay chỉ chọn được vùng trên Space đang hiện).
export function useAppChoices() {
  const [choices, setChoices] = useState<WindowChoice[]>([]);
  const load = () => { if (inWails) ListWindows().then((ws) => setChoices(appChoices(ws))).catch(() => {}); };
  const focus = (id: number) => { FocusWindow(id).catch(() => {}); };
  return { choices, load, focus };
}

// px thật / CSS px theo cách robotgo tính toạ độ: Windows pixel thật, macOS point (= CSS px dù màn Retina).
const pixelScale = () => (navigator.platform.startsWith('Win') ? window.devicePixelRatio : 1);

// Ánh xạ cửa sổ overlay ↔ toạ độ click (coordMap.ts) theo khung màn overlay đang phủ – cố định khi rê chuột.
// sample: gọi mỗi lần chuột di chuyển; chuột đứng yên CALIBRATE_MS thì so với MousePos (chỉ sửa khi cửa sổ lệch góc màn).
export function useCoordMap(disp: Rect | undefined) {
  const [map, setMap] = useState(currentMapping);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => { if (disp) setMap(setDisplay(disp, pixelScale())); }, [disp?.x, disp?.y, disp?.w, disp?.h]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const sample = useCallback((c: Point, now: () => Point) => {
    if (!inWails) return;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const s = await MousePos();
      const n = now();
      if (n.x === c.x && n.y === c.y) setMap(addSample(c, s)); // chuột đã đi tiếp → bỏ mẫu này
    }, CALIBRATE_MS);
  }, []);
  const cancel = useCallback(() => clearTimeout(timer.current), []);
  return { map, sample, cancel };
}

// Khoanh ảnh mẫu (bước 25): khung đã kéo xong (toạ độ cửa sổ), chờ "Dùng ảnh này" (use) / "Khoanh lại" (reset).
// toScreenRect: cửa sổ → màn hình thật, đọc bản mới nhất lúc dùng (độ lệch đo được có thể đổi).
export function useCapture(toScreenRect: (r: Rect) => Rect) {
  const [cap, setCap, capRef] = useRefState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toScreen = useRef(toScreenRect);
  toScreen.current = toScreenRect;
  const use = useCallback(async () => {
    const r = capRef.current;
    if (!r) return;
    setBusy(true);
    const e = await applyCapture(toScreen.current(r));
    setBusy(false);
    if (e) setErr(e);
  }, []);
  const reset = useCallback(() => {
    setCap(null);
    setErr('');
  }, []);
  return { cap, capRef, setCap, busy, err, use, reset };
}

// Nét kéo chuột của công cụ Vẽ đường (bước 50 E1): mẫu theo toạ độ cửa sổ, thưa hơn 3 px thì bỏ. Thả chuột trả nét để chốt.
export function useStroke() {
  const [pts, setPts, ref] = useRefState<Point[]>([]);
  return {
    pts,
    active: pts.length > 0,
    begin: (p: Point) => setPts([p]),
    add: (p: Point) => {
      const last = ref.current[ref.current.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) >= 3) setPts([...ref.current, p]);
    },
    end: (): Point[] => {
      const out = ref.current;
      setPts([]);
      return out;
    },
  };
}
