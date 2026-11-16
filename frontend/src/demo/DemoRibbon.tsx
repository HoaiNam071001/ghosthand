// Ribbon cho màn mẫu (#demo, #demo-flow – bước 63): cùng RibbonView + danh sách lệnh model.ts với app thật, nhưng nút chỉ báo "Màn mẫu".
// Tab và thu gọn dùng state cục bộ (không đụng shellStore); trang Tệp mở thật (shellStore).
import { ReactNode, useEffect, useMemo, useState } from 'react';
import InsertSearch from '../components/ribbon/InsertSearch';
import { LoopButton } from '../components/AppChrome';
import { RunButton } from '../components/RunMenu';
import RibbonView from '../components/ribbon/RibbonView';
import { buildRibbon, RIBBON_TABS, RibbonActions } from '../components/ribbon/model';
import { GROUPS } from '../components/palette/groups';
import type { PaletteGroup } from '../components/PaletteView';
import { closeBackstage, openBackstage, type BackstagePageId, type RibbonTabId, useShell } from '../shellStore';
import { demoRunItems } from './runMenu';

// acts: lệnh thật của màn mẫu (vd bảng thêm node); lệnh khác chỉ báo "Màn mẫu".
export default function DemoRibbon({ notify, running = false, onRun, loop = '3 vòng', insert = GROUPS, extra, acts = {} }: {
  notify: (msg: string) => void; running?: boolean; onRun?: () => void; loop?: string; insert?: PaletteGroup[]; extra?: ReactNode; acts?: Partial<RibbonActions>;
}) {
  // ?tab=insert | run | view | tools – mở sẵn tab; ?bs=home | samples | runs | embed – mở sẵn trang Tệp (chụp màn hình để duyệt)
  const [tab, setTab] = useState<RibbonTabId>(() => (new URLSearchParams(location.search).get('tab') as RibbonTabId) || 'home');
  useEffect(() => {
    const bs = new URLSearchParams(location.search).get('bs');
    if (bs) openBackstage(bs as BackstagePageId);
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const { backstage } = useShell();
  const act = useMemo(() => new Proxy(acts, {
    get: (t, k) => t[k as keyof RibbonActions] ?? (() => notify(`Màn mẫu – lệnh “${String(k)}”`)),
  }) as RibbonActions, [notify, acts]);
  const groups = buildRibbon(tab, {
    running, offline: false, hasInputs: false, hasSteps: true, selectedOn: true, picked: 0, canUndo: true, canRedo: true,
    card: 'compact', detail: 'panel', pinned: false, minimap: true, theme: 'system', insert, slots: { loop: <LoopButton summary={loop}><p className="text-[13px] text-muted">Lặp / đếm ngược: xem màn chính.</p></LoopButton> }, insertQuery: q, act,
  });
  return (
    <RibbonView tabs={RIBBON_TABS} tab={tab} collapsed={collapsed} fileActive={backstage !== null} groups={groups} wrap={tab === 'insert'} lead={tab === 'insert' ? <InsertSearch q={q} onQ={setQ} onOpen={act.palette} /> : undefined}
      right={<>
        {extra}
        <RunButton compact running={running} onRun={() => (onRun ? onRun() : notify('Màn mẫu – không chạy thật'))} items={demoRunItems(notify)} />
      </>}
      onTab={(t) => { closeBackstage(); setTab(t); setCollapsed(false); }} onToggle={() => setCollapsed(!collapsed)}
      onFile={() => (backstage ? closeBackstage() : openBackstage('home'))} />
  );
}
