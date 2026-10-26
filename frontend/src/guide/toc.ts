// Mục lục modal Hướng dẫn: chương chung + trang từng node, tìm không dấu theo tiêu đề rồi nội dung.
import { fold } from '../fold';
import type { InfoKey, NodeInfo } from '../flow/nodeInfo';
import { plainText } from './inline';
import type { Block, Chapter, GuidePage, NodeGuide } from './types';

export type TocNode = { key: InfoKey; label: string; group: string };
export type TocEntry = { page: GuidePage; group: string; title: string; body: string };

export const pageId = (p: GuidePage) => ('chapter' in p ? `c:${p.chapter}` : `n:${p.node}`);

type Label = (t: 'node' | 'chapter', id: string) => string;

const blockText = (b: Block, label: Label) =>
  [b.text, ...(b.items ?? []), ...(b.head ?? []), ...(b.rows ?? []).flat()].filter(Boolean).map((s) => plainText(s!, label)).join(' ');

export function tocEntries(chapters: Chapter[], nodes: TocNode[], info: Record<InfoKey, NodeInfo>,
  guides: Partial<Record<InfoKey, NodeGuide>>, label: Label): TocEntry[] {
  const chs = chapters.map((c): TocEntry => ({
    page: { chapter: c.id }, group: c.group, title: c.title,
    body: [c.summary, ...c.blocks.map((b) => blockText(b, label))].join(' '),
  }));
  const ns = nodes.map((n): TocEntry => {
    const g = guides[n.key];
    const extra = g ? [g.tech, g.accuracy, g.speed, ...(g.works ?? []), ...(g.good ?? []), ...(g.avoid ?? []), ...(g.tips ?? [])] : [];
    return {
      page: { node: n.key }, group: `Node · ${n.group}`, title: n.label,
      body: [info[n.key].desc, info[n.key].use, ...extra].filter(Boolean).map((s) => plainText(s!, label)).join(' '),
    };
  });
  return [...chs, ...ns];
}

// Lọc theo từ khoá (không dấu, mọi từ phải có): khớp tiêu đề xếp trước khớp nội dung.
export function filterToc(entries: TocEntry[], q: string): TocEntry[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return entries;
  const has = (s: string) => { const f = fold(s); return words.every((w) => f.includes(w)); };
  const inTitle = entries.filter((e) => has(e.title));
  const inBody = entries.filter((e) => !has(e.title) && has(`${e.title} ${e.body}`));
  return [...inTitle, ...inBody];
}

// Nhóm liên tiếp theo group, giữ thứ tự đầu vào.
export function groupToc(entries: TocEntry[]): { group: string; entries: TocEntry[] }[] {
  const out: { group: string; entries: TocEntry[] }[] = [];
  for (const e of entries) {
    const g = out.find((x) => x.group === e.group);
    if (g) g.entries.push(e);
    else out.push({ group: e.group, entries: [e] });
  }
  return out;
}
