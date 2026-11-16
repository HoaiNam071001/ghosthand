import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHAPTERS_EN, NODE_GUIDES, NODE_GUIDES_EN } from './content';
import type { Block } from './types';

// Bản Anh phải cùng cấu trúc với bản Việt: cùng loại khối, mẫu / hoạ hoạ, số mục, link [[…]] – chỉ khác chữ.
const shape = (bs: Block[] = []) => bs.map((b) => [b.kind, b.scene ?? '', b.sample ?? '', b.items?.length ?? 0, b.rows?.length ?? 0, b.head?.length ?? 0].join('|'));
const links = (bs: Block[] = []) => bs.flatMap((b) => [b.text ?? '', ...(b.items ?? []), ...(b.rows ?? []).flat()]).flatMap((s) => s.match(/\[\[[^\]]+\]\]/g) ?? []);

describe('Hướng dẫn bản Anh', () => {
  it('đủ mọi chương, cùng thứ tự và cấu trúc', () => {
    expect(CHAPTERS_EN.map((c) => c.id)).toEqual(CHAPTERS.map((c) => c.id));
    CHAPTERS.forEach((c, i) => {
      const e = CHAPTERS_EN[i];
      expect(shape(e.blocks), c.id).toEqual(shape(c.blocks));
      expect(links(e.blocks), c.id).toEqual(links(c.blocks));
    });
  });
  it('đủ mọi trang node, cùng cấu trúc', () => {
    expect(Object.keys(NODE_GUIDES_EN).sort()).toEqual(Object.keys(NODE_GUIDES).sort());
    for (const [k, v] of Object.entries(NODE_GUIDES)) {
      const e = NODE_GUIDES_EN[k as keyof typeof NODE_GUIDES_EN]!;
      expect(shape(e.blocks), k).toEqual(shape(v!.blocks));
      expect(links(e.blocks), k).toEqual(links(v!.blocks));
      for (const f of ['works', 'good', 'avoid', 'tips', 'fields', 'samples'] as const) expect(e[f]?.length ?? 0, `${k}.${f}`).toBe(v![f]?.length ?? 0);
      expect(e.samples, k).toEqual(v!.samples);
      expect(!!e.tech && !!e.speed, k).toBe(!!v!.tech && !!v!.speed);
    }
  });
});
