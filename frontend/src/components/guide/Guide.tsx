// Modal Hướng dẫn nối app: mở qua guideNav (nút ?, F1, "Xem hướng dẫn"), nhớ trang trước để Quay lại, mở mẫu thử qua scriptFile (trang sân thử mở ở Mẫu thử như thường).
import { useEffect, useState } from 'react';
import { Samples } from '../../../wailsjs/go/main/App';
import { CHAPTERS, NODE_GUIDES } from '../../guide/content';
import type { GuidePage } from '../../guide/types';
import { onOpenGuide } from '../../guideNav';
import { openSample } from '../../scriptFile';
import { inWails } from '../../windowMode';
import { usePlatform } from '../palette/usePlatform';
import { GuideDialog } from './GuideDialog';
import { GUIDE_NODES } from './nodes';

const HOME: GuidePage = { chapter: CHAPTERS[0].id };

export default function Guide() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<GuidePage[]>([HOME]);
  const { only } = usePlatform();
  const page = history[history.length - 1];
  const nav = (p: GuidePage) => setHistory((h) => [...h, p]);

  useEffect(() => onOpenGuide((p) => { if (p) nav(p); setOpen(true); }), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setOpen(true); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSample = async (id: string) => {
    const list = await Samples().catch(() => []);
    const s = list?.find((x) => x.id === id);
    openSample(id, s?.name ?? id);
    setOpen(false);
  };
  if (!open) return null;
  return (
    <GuideDialog chapters={CHAPTERS} nodes={GUIDE_NODES} guides={NODE_GUIDES} only={only} page={page}
      onNav={nav} onBack={history.length > 1 ? () => setHistory((h) => h.slice(0, -1)) : undefined}
      onSample={inWails ? onSample : undefined} onClose={() => setOpen(false)} />
  );
}
