// Trang Tệp → Trang đầu (bước 63): bắt đầu nhanh (kịch bản trống + vài mẫu thử), kịch bản của tôi (đang soạn + mở gần đây + AI thử),
// lịch sử chạy gần đây. Thay cho thanh thư viện bên trái cũ.
import { tr } from '../../i18n/lang';
import { ReactNode } from 'react';
import { useLang } from '../../i18n';
import { useEditor } from '../../store';
import { fileName, forgetRecent, newScript, openRecent, openSample, useFile } from '../../scriptFile';
import { scheduleOf, useSchedules } from '../../scheduleStore';
import { openRun, useRunLog } from '../../runStore';
import { inWails } from '../../windowMode';
import { openBackstage } from '../../shellStore';
import { useSamples } from '../samples/Samples';
import AIChip from '../library/AIChip';
import { libraryRun, runDot } from '../library/runs';
import { daysLeft, trialNote } from '../library/trials';
import { RibbonIcon } from '../ribbon/ribbonIcons';
import { StepIcon, StepIconName, STEP_ICON } from '../icons';
import { categoryOfType } from '../../flow/category';

const SAMPLES_SHOWN = 5;
const RUNS_SHOWN = 5;
const rowCls = 'group flex min-h-9 items-center gap-2.5 rounded-md px-3 py-1.5 text-left hover:bg-hover';

export default function HomePage({ onDone }: { onDone: () => void }) {
  useLang();
  const { script, dirty, path } = useEditor();
  const { recent, aiPaths, trials } = useFile();
  const sched = scheduleOf(useSchedules(), path);
  const { history } = useRunLog();
  const { list } = useSamples();
  const trialPaths = new Set(trials.items.map((t) => t.path));
  const go = (run: () => unknown) => () => { onDone(); run(); };
  const now = Date.now();
  return (
    <div className="flex max-w-[900px] flex-col gap-6">
      <Section title={tr('home.new')}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          <Card title={tr('home.blank')} sub={tr('home.blank.sub')} onClick={go(newScript)} disabled={!inWails}
            thumb={<span className="text-2xl text-muted">+</span>} />
          {(list ?? []).slice(0, SAMPLES_SHOWN).map((s) => (
            <Card key={s.id} title={s.name} sub={tr('home.sample')} disabled={!inWails} onClick={go(() => openSample(s.id, s.name))}
              thumb={<SampleThumb type={s.steps[0]} />} />
          ))}
          <Card title={tr('home.allSamples')} sub={tr('home.allSamples.sub')} onClick={() => openBackstage('samples')} thumb={<RibbonIcon name="grid" className="h-6 w-6 text-muted" />} />
        </div>
      </Section>

      <Section title={tr('home.mine')}>
        <div className="flex flex-col">
          <div className={`${rowCls} bg-hover`} aria-current="true" title={path ?? tr('home.notSaved')}>
            <Dot cls={dirty ? 'bg-warn' : 'bg-ok'} />
            <span className="min-w-0 truncate font-semibold">{script.name}</span>
            {script.meta?.createdBy === 'ai' && <AIChip />}
            <span className="text-xs text-muted">{dirty ? tr('home.dirty') : tr('home.current')}</span>
            {sched && <span className="ml-auto font-mono text-[11px] text-muted" title={tr('home.schedAt', { time: sched.time })}>⏱ {sched.time}</span>}
          </div>
          {recent.filter((r) => r !== path && !trialPaths.has(r)).map((r) => (
            <div key={r} className={rowCls}>
              <button title={r} onClick={go(() => openRecent(r))} disabled={!inWails} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                <Dot cls="bg-ok" /><span className="min-w-0 truncate">{fileName(r)}</span>{aiPaths.includes(r) && <AIChip />}
              </button>
              <button onClick={() => forgetRecent(r)} aria-label={tr('home.forgetAria', { name: fileName(r) })} title={tr('home.forgetTip')}
                className="grid h-6 w-6 place-items-center rounded text-muted opacity-0 group-hover:opacity-100 hover:bg-soft hover:text-ink focus-visible:opacity-100">✕</button>
            </div>
          ))}
          {recent.length === 0 && <span className="px-3 py-1.5 text-muted">{tr('home.noRecent')}</span>}
        </div>
      </Section>

      {trials.items.length > 0 && (
        <Section title={tr('home.aiTrials')} hint={trialNote(trials.days)}>
          <div className="flex flex-col">
            {trials.items.filter((t) => t.path !== path).map((t) => {
              const left = daysLeft(t.lastUsed, trials.days, now);
              return (
                <button key={t.path} title={t.path} onClick={go(() => openRecent(t.path))} className={rowCls}>
                  <Dot cls="bg-muted" /><span className="min-w-0 flex-1 truncate">{t.name}</span><AIChip />
                  {left !== null && <span className="font-mono text-[11px] text-muted" title={tr('home.trialLeft')}>{left}d</span>}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title={tr('home.recentRuns')} action={history.length > RUNS_SHOWN ? { label: tr('home.seeAll', { n: history.length }), on: () => openBackstage('runs') } : undefined}>
        <div className="flex flex-col">
          {history.slice(0, RUNS_SHOWN).map((h) => {
            const r = libraryRun(h);
            return (
              <button key={h.id} title={r.result} onClick={go(() => openRun(h.id))} className={rowCls}>
                <Dot cls={runDot(r)} /><span className="min-w-0 flex-1 truncate">{r.script} · {r.result}</span>
                <span className="font-mono text-[11px] text-muted">{r.when}</span>
              </button>
            );
          })}
          {history.length === 0 && <span className="px-3 py-1.5 text-muted">{tr('home.noRuns')}</span>}
        </div>
      </Section>
    </div>
  );
}

const Dot = ({ cls }: { cls: string }) => <span className={`h-1.5 w-1.5 flex-none rounded-full ${cls}`} />;

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: { label: string; on: () => void }; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted">{hint}</span>}
        {action && <button onClick={action.on} className="ml-auto text-[13px] text-accent-text hover:underline">{action.label}</button>}
      </div>
      {children}
    </section>
  );
}

function Card({ title, sub, thumb, onClick, disabled }: { title: string; sub: string; thumb: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex flex-col gap-1.5 rounded-[10px] border border-line bg-surface p-3 text-left enabled:hover:border-line-strong enabled:hover:bg-hover disabled:opacity-60">
      <span className="grid h-16 place-items-center rounded-[7px] bg-canvas">{thumb}</span>
      <span className="line-clamp-2 font-semibold">{title}</span>
      <span className="text-xs text-muted">{sub}</span>
    </button>
  );
}

// Hình đại diện mẫu: icon loại node đầu tiên trong mẫu, tô màu nhóm
function SampleThumb({ type }: { type?: string }) {
  const cat = type ? categoryOfType(type) : undefined;
  if (!type || !(type in STEP_ICON)) return <RibbonIcon name="grid" className="h-6 w-6 text-muted" />;
  return <span className={`${cat ? `cat-${cat}` : ''} grid`}><StepIcon type={type as StepIconName} className="h-6 w-6 text-cat" /></span>;
}
