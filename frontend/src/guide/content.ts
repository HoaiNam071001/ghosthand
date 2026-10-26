// Nội dung Hướng dẫn nạp thẳng từ internal/guide (go:embed bên Go) – chạy được ở #demo không cần Go.
import chapters from '../../../internal/guide/chapters.json';
import nodes from '../../../internal/guide/nodes.json';
import type { InfoKey } from '../flow/nodeInfo';
import type { Chapter, NodeGuide } from './types';

export const CHAPTERS = chapters as Chapter[];
export const NODE_GUIDES = nodes as Partial<Record<InfoKey, NodeGuide>>;
