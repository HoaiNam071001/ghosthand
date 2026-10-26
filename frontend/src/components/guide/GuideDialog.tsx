// Modal Hướng dẫn (bước 51, chỉ hiển thị): mục lục trái, chương / trang node phải. Nối store ở Guide.tsx; màn mẫu #demo-guide dùng thẳng.
import { useEffect, useMemo, useRef, useState } from 'react';
import { InfoKey, NODE_INFO } from '../../flow/nodeInfo';
import { onlyLabel, OnlyOS } from '../../flow/platform';
import { filterToc, TocNode, tocEntries } from '../../guide/toc';
import type { Chapter, GuidePage, NodeGuide } from '../../guide/types';
import type { StepIconName } from '../icons';
import { Blocks, GuideCtx } from './GuideBlocks';
import { GuideNodePage } from './GuideNodePage';
import { GuideToc } from './GuideToc';

export type GuideNodeMeta = TocNode & { icon: StepIconName; type?: string };

export function GuideDialog({ chapters, nodes, guides, only, page, onNav, onBack, onSample, onClose }: {
  chapters: Chapter[]; nodes: GuideNodeMeta[]; guides: Partial<Record<InfoKey, NodeGuide>>; only: OnlyOS;
  page: GuidePage; onNav: (p: GuidePage) => void; onBack?: () => void; onSample?: (id: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const label = useMemo(() => {
    const n = new Map(nodes.map((x) => [x.key as string, x.label]));
    const c = new Map(chapters.map((x) => [x.id, x.title]));
    return (t: 'node' | 'chapter', id: string) => (t === 'node' ? n.get(id) : c.get(id)) ?? id;
  }, [nodes, chapters]);
  const entries = useMemo(() => tocEntries(chapters, nodes, NODE_INFO, guides, label), [chapters, nodes, guides, label]);
  const shown = useMemo(() => filterToc(entries, q), [entries, q]);
  const ctx: GuideCtx = { label, onNav, onSample };
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.scrollTo(0, 0); }, [page]); // Chrome mới: scrollTo trả Promise – không được trả về từ effect

  const chapter = 'chapter' in page ? chapters.find((c) => c.id === page.chapter) : undefined;
  const node = 'node' in page ? nodes.find((n) => n.key === page.node) : undefined;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/25 px-4 pt-[5vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Hướng dẫn" className="flex h-[86vh] w-[980px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-[13px] text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div className="flex flex-none items-center gap-2 border-b border-line px-4 py-2.5">
          {onBack && <button onClick={onBack} aria-label="Quay lại" title="Quay lại trang trước" className="rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-ink">←</button>}
          <div className="text-base font-semibold">Hướng dẫn</div>
          <button onClick={onClose} aria-label="Đóng" className="ml-auto rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-ink">✕</button>
        </div>
        <div className="flex min-h-0 flex-1">
          <GuideToc entries={shown} current={page} q={q} onQ={setQ} onPick={onNav} />
          <div ref={body} className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-5 leading-relaxed">
            {chapter && <>
              <h2 className="text-lg font-semibold">{chapter.title}</h2>
              <p className="-mt-1 text-muted">{chapter.summary}</p>
              <Blocks blocks={chapter.blocks} ctx={ctx} />
            </>}
            {node && <GuideNodePage k={node.key} label={node.label} icon={node.icon} info={NODE_INFO[node.key]} guide={guides[node.key]}
              os={onlyLabel(only, node.type ?? node.key)} ctx={ctx} />}
            {!chapter && !node && <p className="text-muted">Không có trang này.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
