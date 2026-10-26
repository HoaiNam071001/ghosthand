import { describe, expect, it } from 'vitest';
import { CHAPTERS, NODE_GUIDES } from '../../guide/content';
import { ILLUS } from '../palette/illus';

describe('Hướng dẫn', () => {
  it('khối hoạt hoạ trỏ cảnh có thật', () => {
    const blocks = [...CHAPTERS.flatMap((c) => c.blocks), ...Object.values(NODE_GUIDES).flatMap((g) => g?.blocks ?? [])];
    for (const b of blocks.filter((x) => x.kind === 'scene')) expect(ILLUS).toHaveProperty(b.scene!);
  });
});
