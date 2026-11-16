// Ribbon của màn soạn thật (bước 63): nối RibbonView với store – tab đang mở, thu gọn (Ctrl+F1 / bấm đúp tab), trang Tệp, nút Chạy + vòng lặp
// cố định bên phải hàng tab (đổi tab hay thu gọn vẫn bấm được).
import { useEffect, useState } from 'react';
import { useT } from '../../i18n';
import InsertSearch from './InsertSearch';
import { StopScript } from '../../../wailsjs/go/app/App';
import { LoopButton } from '../AppChrome';
import { RunButton } from '../RunMenu';
import RunSettings, { loopBadge, loopSummary } from '../RunSettings';
import PageCheckButton from '../pagecheck/PageCheckButton';
import { getEditor, useEditor } from '../../store';
import { useEngine } from '../../engineStore';
import { startRun, } from '../../runForm';
import { inWails, openOverlay } from '../../windowMode';
import { closeBackstage, openBackstage, openSettingsDialog, setRibbonTab, toggleRibbon, useShell } from '../../shellStore';
import RibbonView from './RibbonView';
import { buildRibbon, RIBBON_TABS } from './model';
import { runItems } from './runItems';
import { useRibbonCtx } from './useRibbonCtx';

const isMac = navigator.platform.startsWith('Mac');

export default function RibbonHost() {
  const t = useT();
  const shell = useShell();
  const { script, selected } = useEditor();
  const { running } = useEngine();
  const [q, setQ] = useState(""); // ô lọc node ở tab Chèn node
  const ctx = useRibbonCtx({ pageCheck: inWails ? <PageCheckButton ribbon /> : undefined, loop: <LoopButton summary={loopSummary(script)}><RunSettings /></LoopButton> }, q);
  const { act } = ctx;
  const cur = script.steps.find((s) => s.id === selected);
  const off = !inWails || running;

  // Ctrl+F1 thu gọn ribbon; Ctrl+, mở Cài đặt (cả khi đang gõ trong ô nhập)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1' && (isMac ? e.metaKey : e.ctrlKey)) { e.preventDefault(); toggleRibbon(); }
      else if (e.key === ',' && (isMac ? e.metaKey : e.ctrlKey) && !e.altKey) { e.preventDefault(); openSettingsDialog(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const right = (
    <>
      <RunButton compact badge={loopBadge(script)} running={running} disabled={!inWails} onRun={(e) => (running ? StopScript() : startRun(e.shiftKey))}
        title={!inWails ? t('rb.t.offline') : !!script.inputs?.length ? t('rb.t.inputsRun') : undefined}
        items={runItems(cur?.ref, off, !!script.inputs?.length, {
          from: cur && ((only) => startRun(false, { from: getEditor().selected, only })),
          step: act.runStep, preview: () => void openOverlay('preview'), record: act.record, inputs: () => act.run(true),
        })} />
    </>
  );
  return (
    <RibbonView tabs={RIBBON_TABS} tab={shell.ribbonTab} collapsed={shell.ribbonCollapsed} fileActive={shell.backstage !== null}
      groups={buildRibbon(shell.ribbonTab, ctx)} wrap={shell.ribbonTab === 'insert'} lead={shell.ribbonTab === 'insert' ? <InsertSearch q={q} onQ={setQ} onOpen={act.palette} /> : undefined} right={right}
      onTab={(t) => { closeBackstage(); setRibbonTab(t); }} onToggle={toggleRibbon} onFile={() => (shell.backstage ? closeBackstage() : openBackstage('home'))} />
  );
}
