// Hook nhỏ của overlay.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Displays, GetSettings, SetOverlayDisplay } from '../../../wailsjs/go/main/App';
import { main } from '../../../wailsjs/go/models';
import { inWails } from '../../windowMode';
import { applyCapture } from '../../imageSteps';
import { Rect } from '../../types';
import { BarSide, toBarSide } from '../../overlay/toolbarLayout';

const BAR_HIDE_MS = 350; // rời thanh / gợi ý bao lâu thì ẩn
const BAR_INTRO_MS = 2500; // mở overlay: hiện thanh một lúc cho dễ thấy

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

// Thanh công cụ tự ẩn: mở khi chuột sát mép trên / rê vào gợi ý, đóng khi rời. Lúc mở overlay hiện một lúc.
export function useAutoHideBar() {
  const [open, setOpen] = useState(true);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(true);
  }, []);
  const leave = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), BAR_HIDE_MS);
  }, []);
  useEffect(() => {
    timer.current = window.setTimeout(() => setOpen(false), BAR_INTRO_MS);
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

// Nhiều màn hình: chọn màn cho overlay (Go dời cửa sổ, nhớ lựa chọn cho lần mở sau); onSwitched để đo lại toạ độ.
export function useDisplays(onSwitched: () => void) {
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
    onSwitched();
    load();
  };
  return { displays, current, pick };
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
