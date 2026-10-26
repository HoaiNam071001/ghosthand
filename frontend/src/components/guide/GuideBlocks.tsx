// Khối nội dung Hướng dẫn (chỉ hiển thị): đoạn, danh sách, bảng, mẹo / cảnh báo, hoạt hoạ node, nút Mở mẫu thử.
import { ReactNode } from 'react';
import type { InfoKey } from '../../flow/nodeInfo';
import { parseInline } from '../../guide/inline';
import type { Block, GuidePage } from '../../guide/types';
import { ILLUS } from '../palette/illus';

export type GuideCtx = {
  label: (t: 'node' | 'chapter', id: string) => string;
  onNav: (p: GuidePage) => void;
  onSample?: (id: string) => void; // không có = không mở được mẫu (trình duyệt không có Go)
};

const link = 'inline text-left font-medium text-accent-text hover:underline';

export function Inline({ text, ctx }: { text: string; ctx: GuideCtx }) {
  return <>{parseInline(text).map((p, i) => {
    switch (p.t) {
      case 'bold': return <strong key={i} className="font-semibold">{p.v}</strong>;
      case 'em': return <em key={i}>{p.v}</em>;
      case 'code': return <code key={i} className="rounded bg-soft px-1 py-px font-mono text-[12px]">{p.v}</code>;
      case 'node': return <button key={i} className={link} onClick={() => ctx.onNav({ node: p.v as InfoKey })}>{ctx.label('node', p.v)}</button>;
      case 'chapter': return <button key={i} className={link} onClick={() => ctx.onNav({ chapter: p.v })}>{ctx.label('chapter', p.v)}</button>;
      default: return <span key={i}>{p.v}</span>;
    }
  })}</>;
}

export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: GuideCtx }) {
  return <>{blocks.map((b, i) => <GuideBlock key={i} b={b} ctx={ctx} />)}</>;
}

function GuideBlock({ b, ctx }: { b: Block; ctx: GuideCtx }) {
  const t = (s?: string) => <Inline text={s ?? ''} ctx={ctx} />;
  switch (b.kind) {
    case 'h': return <h3 className="mt-2 text-[14px] font-semibold">{t(b.text)}</h3>;
    case 'list': return <ul className="flex list-disc flex-col gap-1 pl-5">{b.items?.map((s, i) => <li key={i}>{t(s)}</li>)}</ul>;
    case 'steps': return <ol className="flex list-decimal flex-col gap-1 pl-5">{b.items?.map((s, i) => <li key={i}>{t(s)}</li>)}</ol>;
    case 'table': return <GuideTable b={b} t={t} />;
    case 'tip': return <Callout tone="tip">{t(b.text)}</Callout>;
    case 'warn': return <Callout tone="warn">{t(b.text)}</Callout>;
    case 'scene': return <Scene k={b.scene as InfoKey} caption={b.text ? t(b.text) : undefined} />;
    case 'sample': return <SampleRow id={b.sample!} text={t(b.text)} onSample={ctx.onSample} />;
    default: return <p>{t(b.text)}</p>;
  }
}

function GuideTable({ b, t }: { b: Block; t: (s?: string) => ReactNode }) {
  return (
    <div className="flex-none overflow-x-auto rounded-card border border-line">
      <table className="w-full border-collapse text-left text-[12.5px]">
        <thead className="bg-soft text-muted"><tr>{b.head?.map((h, i) => <th key={i} className="px-2.5 py-1.5 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{b.rows?.map((r, i) => (
          <tr key={i} className="border-t border-line align-top">{r.map((c, j) => <td key={j} className={`px-2.5 py-1.5 ${j === 0 ? 'font-medium' : ''}`}>{t(c)}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Callout({ tone, children }: { tone: 'tip' | 'warn'; children: ReactNode }) {
  return (
    <div className={`rounded-card border-l-[3px] px-3 py-2 ${tone === 'tip' ? 'border-accent bg-accent-soft' : 'border-warn bg-soft'}`}>
      <span className={`mr-1.5 font-semibold ${tone === 'tip' ? 'text-accent-text' : 'text-warn'}`}>{tone === 'tip' ? 'Mẹo:' : 'Lưu ý:'}</span>{children}
    </div>
  );
}

export function Scene({ k, caption, big }: { k: InfoKey; caption?: ReactNode; big?: boolean }) {
  const scene = ILLUS[k];
  if (!scene) return null;
  return (
    <figure className={`flex flex-col gap-1.5 ${big ? '' : 'max-w-[360px]'}`}>
      <div className="aspect-[240/135] overflow-hidden rounded-card border border-line bg-bg">{scene()}</div>
      {caption && <figcaption className="text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}

export function SampleRow({ id, text, onSample }: { id: string; text?: ReactNode; onSample?: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-bg px-3 py-2">
      <span className="min-w-0 flex-1">{text}<span className="ml-1.5 font-mono text-[11px] text-muted">{id}</span></span>
      <button disabled={!onSample} onClick={() => onSample?.(id)} title={onSample ? 'Mở kịch bản mẫu trên canvas' : 'Cần chạy trong app'}
        className="h-8 flex-none rounded-control border border-line bg-surface px-3 text-[12.5px] font-medium enabled:hover:bg-hover disabled:opacity-60">Mở mẫu thử</button>
    </div>
  );
}
