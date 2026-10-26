import { describe, expect, it } from 'vitest';
import { NODE_INFO } from '../flow/nodeInfo';
import { CHAPTERS, NODE_GUIDES } from './content';
import { filterToc, groupToc, pageId, tocEntries } from './toc';
import type { Chapter } from './types';

const chapters: Chapter[] = [
  { id: 'a', group: 'Bắt đầu', title: 'Quyền hệ điều hành', summary: 'Trợ năng', blocks: [{ kind: 'p', text: 'Xem [[node:click]]' }] },
  { id: 'b', group: 'Dùng app', title: 'Chạy', summary: '', blocks: [{ kind: 'table', head: ['x'], rows: [['Dừng khẩn cấp']] }] },
];
const nodes = [{ key: 'click' as const, label: 'Click', group: 'Chuột' }];
const label = (t: string, id: string) => (t === 'node' ? 'Nhãn ' + id : id);
const entries = tocEntries(chapters, nodes, NODE_INFO, {}, label);

describe('toc', () => {
  it('gồm chương rồi node', () => {
    expect(entries.map((e) => pageId(e.page))).toEqual(['c:a', 'c:b', 'n:click']);
    expect(entries[0].body).toContain('Nhãn click');
  });
  it('tìm không dấu, tiêu đề trước nội dung', () => {
    expect(filterToc(entries, 'quyen').map((e) => e.title)).toEqual(['Quyền hệ điều hành']);
    expect(filterToc(entries, 'dung khan').map((e) => e.title)).toEqual(['Chạy']);
    expect(filterToc(entries, 'click').map((e) => e.title)).toEqual(['Click', 'Quyền hệ điều hành']);
    expect(filterToc(entries, '  ')).toHaveLength(3);
  });
  it('nhóm giữ thứ tự', () => {
    expect(groupToc(entries).map((g) => g.group)).toEqual(['Bắt đầu', 'Dùng app', 'Node · Chuột']);
  });
});

// Nội dung thật: link node trỏ InfoKey có thật (link chương + mẫu thử kiểm ở guide_test.go).
describe('nội dung', () => {
  it('link node có thật', () => {
    const texts = [...CHAPTERS.flatMap((c) => c.blocks), ...Object.values(NODE_GUIDES).flatMap((g) => [
      ...(g?.blocks ?? []), { kind: 'p' as const, text: [g?.tech, g?.accuracy, ...(g?.avoid ?? []), ...(g?.good ?? []), ...(g?.tips ?? [])].join(' ') }])]
      .flatMap((b) => [b.text ?? '', ...(b.items ?? []), ...(b.rows ?? []).flat()]);
    for (const s of texts) for (const m of s.matchAll(/\[\[node:([\w-]+)\]\]/g)) expect(NODE_INFO).toHaveProperty(m[1]);
  });
  it('khoá nodes.json là InfoKey', () => {
    for (const k of Object.keys(NODE_GUIDES)) expect(NODE_INFO).toHaveProperty(k);
  });
});
