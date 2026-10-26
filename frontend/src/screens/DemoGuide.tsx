// Màn #demo-guide (bước 51): modal Hướng dẫn với nội dung thật, không cần Go (nút Mở mẫu thử tắt).
import { useState } from 'react';
import { GuideDialog } from '../components/guide/GuideDialog';
import { GUIDE_NODES } from '../components/guide/nodes';
import type { InfoKey } from '../flow/nodeInfo';
import { CHAPTERS, NODE_GUIDES } from '../guide/content';
import type { GuidePage } from '../guide/types';

// ?page=c:<chương> | n:<InfoKey> – mở thẳng một trang (xem từng trang trên trình duyệt)
function startPage(): GuidePage {
  const p = new URLSearchParams(location.search).get('page') ?? '';
  if (p.startsWith('n:')) return { node: p.slice(2) as InfoKey };
  return { chapter: p.startsWith('c:') ? p.slice(2) : CHAPTERS[0].id };
}

export default function DemoGuide() {
  const [history, setHistory] = useState<GuidePage[]>(() => [startPage()]);
  return (
    <div className="min-h-screen bg-bg">
      <GuideDialog chapters={CHAPTERS} nodes={GUIDE_NODES} guides={NODE_GUIDES} only={{}} page={history[history.length - 1]}
        onNav={(p) => setHistory((h) => [...h, p])} onBack={history.length > 1 ? () => setHistory((h) => h.slice(0, -1)) : undefined}
        onClose={() => setHistory((h) => h.slice(0, 1))} />
    </div>
  );
}
