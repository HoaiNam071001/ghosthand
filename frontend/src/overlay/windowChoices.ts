// App cho overlay chọn vùng "nhảy tới": mỗi app một dòng (cửa sổ trên cùng của nó), bỏ cửa sổ thu nhỏ / không tiêu đề.
// macOS: app toàn màn hình ở Space riêng – focus cửa sổ đó thì hệ thống chuyển sang Space của nó.
export type WindowChoice = { id: number; app: string; title: string; minimized: boolean };

export function appChoices(wins: WindowChoice[]): WindowChoice[] {
  const seen = new Set<string>();
  const out: WindowChoice[] = [];
  for (const w of wins) {
    if (w.minimized || !w.app || seen.has(w.app)) continue;
    seen.add(w.app);
    out.push(w);
  }
  return out;
}
