// Nội dung Hướng dẫn nạp thẳng từ internal/guide (go:embed bên Go) – chạy được ở #demo không cần Go.
// Bản tiếng Anh (*.en.json) cùng cấu trúc, ghi đè theo id chương / khoá node; thiếu thì dùng bản Việt. MCP chỉ đọc bản Việt.
import chapters from '../../../internal/guide/chapters.json';
import nodes from '../../../internal/guide/nodes.json';
import chaptersEn from '../../../internal/guide/chapters.en.json';
import nodesEn from '../../../internal/guide/nodes.en.json';
import type { Lang } from '../i18n/core';
import type { InfoKey } from '../flow/nodeInfo';
import type { Chapter, NodeGuide } from './types';

export const CHAPTERS = chapters as Chapter[];
export const NODE_GUIDES = nodes as Partial<Record<InfoKey, NodeGuide>>;
export const CHAPTERS_EN = chaptersEn as Chapter[];
export const NODE_GUIDES_EN = nodesEn as Partial<Record<InfoKey, NodeGuide>>;

const cache: Partial<Record<Lang, { chapters: Chapter[]; nodes: Partial<Record<InfoKey, NodeGuide>> }>> = {};

// Nội dung theo ngôn ngữ đang dùng (bản Anh ghi đè bản Việt theo id / khoá).
export function guideContent(lang: Lang) {
  if (lang !== 'en') return { chapters: CHAPTERS, nodes: NODE_GUIDES };
  return (cache.en ??= {
    chapters: CHAPTERS.map((c) => CHAPTERS_EN.find((e) => e.id === c.id) ?? c),
    nodes: { ...NODE_GUIDES, ...NODE_GUIDES_EN },
  });
}
