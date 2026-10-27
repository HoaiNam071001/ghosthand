// Kéo node này thả lên node kia kèm phím → nối cổng ra của node kéo tới node thả.
// Ctrl / Cmd = cổng đầu (thành công / đúng…), Option / Alt = cổng thứ hai (thất bại / sai…),
// F<n> (kèm Ctrl / Cmd hoặc Option) = cổng thứ n theo thứ tự `portsOf` (switch: case n).
export type DragKeys = { mod: boolean; alt: boolean; fn: number }; // fn: 0 = không giữ F-phím

export function portForDrag(ports: string[], k: DragKeys): string | null {
  if (k.fn > 0) return (k.mod || k.alt) ? ports[k.fn - 1] ?? null : null;
  if (k.mod) return ports[0] ?? null;
  if (k.alt) return ports[1] ?? null;
  return null;
}

export const fnOfKey = (code: string): number => {
  const m = /^F([1-9])$/.exec(code);
  return m ? Number(m[1]) : 0;
};
