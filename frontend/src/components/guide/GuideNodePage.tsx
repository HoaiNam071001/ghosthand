// Trang một loại node trong Hướng dẫn (chỉ hiển thị): hoạt hoạ lớn + làm gì / dùng khi (flow/nodeInfo) + phần riêng của nodes.json.
import { ReactNode } from 'react';
import type { InfoKey, NodeInfo } from '../../flow/nodeInfo';
import type { NodeGuide } from '../../guide/types';
import { StepIcon, StepIconName } from '../icons';
import { Blocks, GuideCtx, Inline, SampleRow, Scene } from './GuideBlocks';

export function GuideNodePage({ k, label, icon, info, guide, os, ctx }: {
  k: InfoKey; label: string; icon: StepIconName; info: NodeInfo; guide?: NodeGuide; os?: string; ctx: GuideCtx;
}) {
  const t = (s: string) => <Inline text={s} ctx={ctx} />;
  return (
    <>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <StepIcon type={icon} className="h-5 w-5 text-accent-text" />{label}
        {os && <span className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-muted">{os}</span>}
      </h2>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Scene k={k} big />
        <div className="flex flex-col gap-2">
          <p>{info.desc}</p>
          <p className="text-muted"><span className="font-semibold">Dùng khi:</span> {info.use}</p>
        </div>
      </div>
      {guide && <>
        <Facts rows={[['Công nghệ', guide.tech], ['Độ chính xác', guide.accuracy], ['Tốc độ', guide.speed]]} t={t} />
        <ListSection title="Chạy được với" items={guide.works} t={t} />
        <ListSection title="Nên dùng khi" items={guide.good} t={t} />
        <ListSection title="Không nên dùng khi" items={guide.avoid} t={t} />
        <ListSection title="Mẹo / lỗi hay gặp" items={guide.tips} t={t} />
        {guide.blocks && <Blocks blocks={guide.blocks} ctx={ctx} />}
        {guide.samples?.map((id) => <SampleRow key={id} id={id} text="Kịch bản mẫu dùng node này" onSample={ctx.onSample} />)}
      </>}
      {!guide && <p className="text-xs text-muted">Trang chi tiết của node này (công nghệ, độ chính xác, mẹo, ví dụ) đang được viết.</p>}
    </>
  );
}

function Facts({ rows, t }: { rows: [string, string | undefined][]; t: (s: string) => ReactNode }) {
  const shown = rows.filter((r): r is [string, string] => !!r[1]);
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-card border border-line bg-bg px-3 py-2.5">
      {shown.map(([k, v]) => <div key={k} className="contents"><dt className="font-semibold text-muted">{k}</dt><dd>{t(v)}</dd></div>)}
    </dl>
  );
}

function ListSection({ title, items, t }: { title: string; items?: string[]; t: (s: string) => ReactNode }) {
  if (!items?.length) return null;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[14px] font-semibold">{title}</h3>
      <ul className="flex list-disc flex-col gap-1 pl-5">{items.map((s, i) => <li key={i}>{t(s)}</li>)}</ul>
    </section>
  );
}
