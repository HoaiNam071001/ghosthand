// Màn #demo (bước 27b): giao diện đầy đủ theo design v2 với kịch bản mẫu, kể cả tính năng chưa có logic –
// để xem / so với canvas. Không nối Go, không đụng store kịch bản thật.
import { useState } from 'react';
import TitleBar from '../components/TitleBar';
import { LibraryView } from '../components/Library';
import { StatusBar, Toolbar } from '../components/AppChrome';
import { demoRunItems } from '../demo/runMenu';
import ScheduleDialog, { Schedule, ScheduleRow } from '../components/ScheduleDialog';
import { GroupFrame, StaticCard } from '../components/StepCard';
import RunDialog from '../components/inputs/RunDialog';
import DemoInspector from '../demo/DemoInspector';
import PageCheckDemo from '../demo/PageCheckDemo';
import {
  demoInputs, demoItems, demoLibrary, demoNumbers, demoPresets, demoRunSections, DemoStep, findDemoStep,
} from '../demo/demoScript';

export default function DemoScreen() {
  const [selected, setSelected] = useState('d3');
  const cur = selected === 'g1' ? demoItems.find((i) => i.id === 'g1') : findDemoStep(selected);
  const [inputs, setInputs] = useState(demoInputs);
  const [runOpen, setRunOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [recording, setRecording] = useState(false);

  const card = (s: DemoStep) => (
    <StaticCard key={s.id} icon={s.type} n={demoNumbers.get(s.id)!} title={s.title} detail={s.detail} delay={s.delay}
      enabled={s.enabled !== false} chips={s.chips} breakpoint={s.breakpoint}
      tags={s.enabled === false && <span className="rounded-full bg-soft px-[7px] py-px text-[11px] text-muted">Tắt</span>}
      selected={s.id === selected} onSelect={() => setSelected(s.id)} />
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-ink">
      <TitleBar />
      <Toolbar name="Nhắn tin Facebook" unsaved loop="10 vòng" loopPanel={<div className="flex flex-col gap-3"><p className="text-[13px] text-muted">Lặp / đếm ngược: xem màn chính.</p><ScheduleRow value={schedule} onEdit={() => setScheduleOpen(true)} /></div>}
        running={false} onRun={() => setRunOpen(true)} onPreview={() => {}}
        runItems={demoRunItems(setNotice, { on: recording, toggle: () => setRecording(!recording) })}
        extra={recording && (
          <span className="btn-danger-soft flex h-[34px] items-center gap-2 rounded-control px-3 text-[13px]">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />Đang ghi <span className="font-mono">0:07</span>
          </span>
        )} />

      <div className="flex min-h-0 flex-1 border-t border-line">
        <LibraryView {...demoLibrary} />

        <main aria-label="Danh sách bước (mẫu)" className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-[22px] py-4">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold">Các bước</h1>
            <span className="text-muted">10 bước, 1 nhóm</span>
            <span className="ml-auto"><PageCheckDemo /></span>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">Màn mẫu #demo</span>
          </div>
          <ol className="flex flex-col gap-1.5">
            {demoItems.map((it) => it.type === 'group'
              ? <GroupFrame key={it.id} name={it.name} repeat={it.repeat} selected={selected === it.id} onSelect={() => setSelected(it.id)}>{it.children.map(card)}</GroupFrame>
              : card(it))}
          </ol>
          <button className="flex h-[42px] flex-none items-center justify-center gap-2.5 rounded-card border border-dashed border-line-strong text-muted">
            + Thêm bước <span className="font-mono text-[11px]">Ctrl+K</span>
          </button>
        </main>

        {cur && <DemoInspector key={cur.id} step={cur} n={demoNumbers.get(cur.id) ?? ''} inputs={inputs} setInputs={setInputs} />}
      </div>

      <StatusBar running={false} mouse="X 1204 Y 388">
        <span>Bản nháp tự lưu lúc 14:32</span>
        {notice && <span className="text-accent-text">{notice}</span>}
      </StatusBar>
      {scheduleOpen && (
        <ScheduleDialog value={schedule} presets={demoPresets.map((p) => p.name)} onClose={() => setScheduleOpen(false)}
          onSave={(s) => { setSchedule(s); setScheduleOpen(false); }} onRemove={() => { setSchedule(null); setScheduleOpen(false); }} />
      )}
      {runOpen && (
        <RunDialog scriptName="Nhắn tin Facebook" inputs={inputs} sections={demoRunSections} presets={demoPresets} countdown
          onClose={() => setRunOpen(false)}
          onRun={(v) => { setRunOpen(false); setNotice(`Màn mẫu – không chạy thật (M1 = ${v.M1 || '…'})`); }} />
      )}
    </div>
  );
}
