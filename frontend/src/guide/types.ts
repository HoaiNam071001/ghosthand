// Kiểu nội dung Hướng dẫn (bước 51) – cùng tên trường với internal/guide/guide.go (test hai bên đọc cùng file JSON).
import type { InfoKey } from '../flow/nodeInfo';

export type BlockKind = 'p' | 'h' | 'list' | 'steps' | 'table' | 'tip' | 'warn' | 'scene' | 'sample';

export type Block = {
  kind: BlockKind;
  text?: string;
  items?: string[];
  head?: string[];
  rows?: string[][];
  scene?: string; // InfoKey của hoạt hoạ (bước 47)
  sample?: string; // id mẫu thử (bước 33)
};

export type Chapter = { id: string; group: string; title: string; summary: string; blocks: Block[] };

// Phần riêng của trang node – làm gì / dùng khi lấy từ flow/nodeInfo.ts, không chép.
export type NodeGuide = {
  tech?: string; works?: string[]; accuracy?: string; speed?: string;
  good?: string[]; avoid?: string[]; tips?: string[]; samples?: string[]; blocks?: Block[];
};

// Trang đang xem: một chương hoặc trang một loại node.
export type GuidePage = { chapter: string } | { node: InfoKey };
