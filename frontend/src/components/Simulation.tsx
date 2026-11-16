// Xem trước kịch bản: con trỏ giả chạy theo các node trên overlay, không điều khiển chuột thật. Đi theo đồ thị từ start:
// node rẽ nhánh theo menu Nhánh (flow/preview.ts), từng node diễn ở simulation/playNode.ts.
import { tr } from '../i18n/lang';
import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../store';
import { BranchChoices, hopText, newWalk, previewHop, routeText, stopText, type Hop } from '../flow/preview';
import { effectiveHuman } from '../flow/human';
import { curveAt, HUMAN_PROFILES, humanLegs } from '../overlay/humanPath';
import { Point, Rect, ScrollDirection, Step, stepLabel, Script } from '../types';
import { scrollDelta } from '../scroll';
import { playNode, type Player } from './simulation/playNode';

const TRAVEL_MS = 300; // thời gian con trỏ giả bay tới điểm khi tắt giống người (engine thật dịch chuyển tức thì)
const RIPPLE_MS = 700;
const MAX_TRAIL = 60;
// Khung hình bằng setTimeout thay vì requestAnimationFrame: rAF có thể không chạy khi trình duyệt
// không vẽ khung hình (đã gặp ở Chrome headless) – setTimeout luôn chạy, ~60 khung/giây là đủ mượt.
const FRAME_MS = 16;
const nextFrame = (cb: (now: number) => void) => setTimeout(() => cb(performance.now()), FRAME_MS);

type Segment = { from: Point; to: Point; drag: boolean; pts?: Point[] }; // pts: các điểm đường cong (giống người)
type Ripple = { id: number; at: Point; hold?: number }; // hold: ms giữ chuột (vòng lớn dần)

export type SimState = {
  running: boolean;
  pos: Point | null; // toạ độ màn hình (robotgo) của con trỏ giả
  pressed: boolean;
  step: string | null; // id node đang diễn
  route: string; // đường đã đi: "n1 → n2 ✗ → n5 (1/10)"
  label: string;
  bubble: string; // chữ cạnh con trỏ: chờ / gõ / phím
  trail: Segment[];
  ripples: Ripple[];
  // bước cuộn đang chạy: k 0..1 = đã cuộn bao nhiêu phần quãng dist (px); view: cỡ vùng / màn hình đang cuộn
  scroll: { from: Point; dir: ScrollDirection; dist: number; view: { w: number; h: number }; k: number } | null;
  offset: Point; // trang nền đã cuộn bao nhiêu px (cộng dồn các bước cuộn trong lượt xem trước)
};

const idle: SimState = {
  running: false, pos: null, pressed: false, step: null, route: '', label: '', bubble: '', trail: [], ripples: [], scroll: null, offset: { x: 0, y: 0 },
};

// Khoảng trang nền cần vẽ: offset nhỏ / lớn nhất qua mọi bước cuộn đang bật (cuộn lên trước thì trang có phần phía trên).
export function scrollRange(steps: Step[]) {
  const r = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let x = 0, y = 0;
  for (const s of steps) {
    if (!s.enabled || s.type !== 'scroll') continue;
    const d = scrollDelta(s);
    x += d.x;
    y += d.y;
    r.minX = Math.min(r.minX, x); r.maxX = Math.max(r.maxX, x);
    r.minY = Math.min(r.minY, y); r.maxY = Math.max(r.maxY, y);
  }
  return r;
}

class Stopped extends Error {}

export function useSimulation(sc: Pick<Script, 'steps' | 'start' | 'edges' | 'human'>, region: Rect | null, speed: number, choices: BranchChoices) {
  const [sim, setSim] = useState<SimState>(idle);
  const token = useRef(0); // tăng lên để huỷ lượt chạy đang dở
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const choicesRef = useRef(choices); // đổi nhánh giữa lượt thì node rẽ nhánh sau dùng lựa chọn mới
  choicesRef.current = choices;

  useEffect(() => () => void token.current++, []); // rời overlay → dừng

  const stop = () => {
    token.current++;
    setSim((s) => ({ ...s, running: false, pressed: false, bubble: '', label: s.step ? tr('sm.stopped') : '' }));
  };

  const start = async () => {
    const my = ++token.current;
    const alive = () => {
      if (token.current !== my) throw new Stopped();
    };
    const patch = (p: Partial<SimState> | ((s: SimState) => Partial<SimState>)) =>
      setSim((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));
    // chờ ms (theo tốc độ xem trước), dừng được giữa chừng
    const wait = (ms: number) => new Promise<void>((res, rej) => {
      const t = setTimeout(() => (token.current === my ? res() : rej(new Stopped())), ms / speedRef.current);
      if (token.current !== my) clearTimeout(t);
    });
    // công cụ diễn cho playNode – hàm di chuột gắn vào sau khi khai báo (chúng đọc / ghi pl.pos)
    const pl = { pos: null, offset: { x: 0, y: 0 }, region, patch, wait } as Pick<Player, 'pos' | 'offset' | 'region' | 'patch' | 'wait'> as Player;
    // bay / kéo con trỏ tới p trong ms, để lại vệt
    const moveTo = (p: Point, ms: number, drag = false) => new Promise<void>((res, rej) => {
      const from = pl.pos ?? p;
      const t0 = performance.now();
      const frame = (now: number) => {
        if (token.current !== my) return rej(new Stopped());
        const k = Math.min(Math.max((now - t0) / (ms / speedRef.current), 0), 1);
        const e = drag ? k : 1 - (1 - k) ** 3; // kéo thả đều, bay thì chậm dần
        pl.pos = { x: from.x + (p.x - from.x) * e, y: from.y + (p.y - from.y) * e };
        patch({ pos: pl.pos });
        if (k < 1) return nextFrame(frame);
        if (from.x !== p.x || from.y !== p.y) {
          patch((s) => ({ trail: [...s.trail, { from, to: p, drag }].slice(-MAX_TRAIL) }));
        }
        res();
      };
      nextFrame(frame);
    });
    // chạy f(k) với k 0 → 1 trong ms (theo tốc độ xem trước)
    const animate = (ms: number, f: (k: number) => void) => new Promise<void>((res, rej) => {
      const t0 = performance.now();
      const frame = (now: number) => {
        if (token.current !== my) return rej(new Stopped());
        const k = Math.min((now - t0) / (ms / speedRef.current), 1);
        f(k);
        if (k < 1) nextFrame(frame);
        else res();
      };
      nextFrame(frame);
    });
    // tới p như chuột thật: node có mức giống người → đi theo đường cong + thời gian như engine (humanLegs),
    // tắt → bay thẳng TRAVEL_MS. dragMs: đang kéo thả, đi đúng chừng này
    const travel = async (p: Point, s: Step, dragMs?: number) => {
      const drag = dragMs !== undefined;
      const prof = HUMAN_PROFILES[effectiveHuman(sc.human, s.human)];
      if (!prof || !pl.pos) return moveTo(p, drag ? Math.max(dragMs, 1) : TRAVEL_MS, drag);
      for (const l of humanLegs(pl.pos, p, prof, drag ? { durMs: Math.max(dragMs, 1) } : {})) {
        await wait(l.pauseMs); // khựng trước khi chỉnh lại sau khi đi lố
        const pts: Point[] = [l.from];
        if (l.ms > 0) {
          await animate(l.ms, (k) => {
            pl.pos = curveAt(l.from, l.c1, l.c2, l.to, k);
            pts.push(pl.pos);
            patch({ pos: pl.pos });
          });
        }
        pl.pos = l.to;
        patch((st) => ({ pos: l.to, trail: [...st.trail, { from: l.from, to: l.to, drag, pts: [...pts, l.to] }].slice(-MAX_TRAIL) }));
      }
    };
    let rid = 0;
    const ripple = (at: Point, hold?: number) => {
      const r = { id: ++rid, at, hold };
      patch((s) => ({ ripples: [...s.ripples, r] }));
      setTimeout(() => patch((s) => ({ ripples: s.ripples.filter((x) => x.id !== r.id) })),
        ((hold ?? 0) + RIPPLE_MS) / speedRef.current);
    };

    Object.assign(pl, { moveTo, animate, travel, ripple });

    setSim({ ...idle, running: true });
    const ends = endpoints(sc, region);
    const byId = new Map(sc.steps.map((s) => [s.id, s]));
    const walk = newWalk();
    const route: string[] = [];
    let last: { h: Hop; s: Step } | undefined;
    try {
      for (let cur = sc.start; byId.has(cur);) {
        const s = byId.get(cur)!;
        alive();
        patch({ step: s.id, label: `${s.ref} · ${stepLabel(s)}${s.type === 'click' && s.clicks > 1 ? ` ×${s.clicks}` : ''}`, bubble: '' });
        if (s.enabled) {
          await playNode(s, ends.get(s.id), pl);
          if (s.delayAfter > 0) patch((st) => ({ bubble: st.bubble || tr('sm.wait', { n: s.delayAfter }) }));
          await wait(s.delayAfter);
          patch({ bubble: '' });
        }
        last = { h: previewHop(sc, s, choicesRef.current, walk), s };
        route.push(hopText(last.h, s));
        patch({ route: routeText(route) });
        cur = last.h.next;
      }
      patch({ running: false, pressed: false, label: stopText(last?.h, last?.s), bubble: '', scroll: null });
    } catch (err) {
      if (!(err instanceof Stopped)) throw err;
    }
  };

  return { sim, start, stop };
}
