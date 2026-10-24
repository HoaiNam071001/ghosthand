// Khung nhóm node (bước 39 G1) trên canvas: khung nét đứt bao các thẻ (kéo thanh tên để dời cả cụm) và thẻ nhóm thu gọn.
// Chỉ hiển thị – thao tác báo qua callback trong data.
import { useState } from 'react';
import { Handle, Node, NodeProps, Position } from '@xyflow/react';
import { FlowGroupView, inputY } from './model';

export type GroupActions = { onToggle: (id: string) => void; onUngroup: (id: string) => void; onRename: (id: string, name: string) => void };
export type GroupData = { view: FlowGroupView } & GroupActions;
export type GroupFrameNode = Node<GroupData, 'group'>;
export type GroupCardNode = Node<GroupData, 'groupCard'>;

export const GROUP_HANDLE = '.group-head'; // chỗ nắm để kéo

function Title({ view, onRename }: { view: FlowGroupView; onRename: GroupActions['onRename'] }) {
  const [edit, setEdit] = useState(false);
  if (edit) {
    return (
      <input autoFocus defaultValue={view.name} aria-label="Tên nhóm" maxLength={40}
        onBlur={(e) => { setEdit(false); onRename(view.id, e.target.value); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEdit(false); }}
        className="nodrag min-w-0 flex-1 rounded border border-line-strong bg-field px-1 text-[12px] font-semibold" />
    );
  }
  return <span onDoubleClick={() => setEdit(true)} title="Bấm đúp để đổi tên" className="min-w-0 flex-1 truncate text-[12px] font-semibold">{view.name}</span>;
}

function Buttons({ view, onToggle, onUngroup }: Pick<GroupActions, 'onToggle' | 'onUngroup'> & { view: FlowGroupView }) {
  const btn = 'nodrag grid h-5 w-5 flex-none place-items-center rounded text-muted hover:bg-hover hover:text-ink';
  return (
    <>
      <button onClick={() => onToggle(view.id)} aria-label={view.collapsed ? 'Mở rộng nhóm' : 'Thu gọn nhóm'} title={view.collapsed ? 'Mở rộng' : 'Thu gọn thành một thẻ'} className={btn}>
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={view.collapsed ? 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' : 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'} />
        </svg>
      </button>
      <button onClick={() => onUngroup(view.id)} aria-label="Bỏ nhóm" title="Bỏ nhóm (node giữ nguyên)" className={btn}>
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </>
  );
}

export function GroupFrame({ data }: NodeProps<GroupFrameNode>) {
  const { view } = data;
  return (
    <div style={{ width: view.box.w, height: view.box.h }} className="rounded-xl border border-dashed border-line-strong bg-soft/40">
      <div className="group-head flex h-[30px] cursor-grab items-center gap-1 px-2.5 text-muted">
        <Title view={view} onRename={data.onRename} />
        <span className="flex-none font-mono text-[10.5px]">{view.members.length}</span>
        <Buttons view={view} onToggle={data.onToggle} onUngroup={data.onUngroup} />
      </div>
    </div>
  );
}

export function GroupCard({ data, selected }: NodeProps<GroupCardNode>) {
  const { view } = data;
  return (
    <div style={{ width: view.box.w, height: view.box.h }}
      className={`group-head flex flex-col justify-center gap-0.5 rounded-[10px] border-2 border-dashed border-line-strong bg-surface px-2.5 ${selected ? 'ring-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" style={{ top: inputY }} className="flow-handle flow-handle-in" />
      <div className="flex items-center gap-1">
        <Title view={view} onRename={data.onRename} />
        <Buttons view={view} onToggle={data.onToggle} onUngroup={data.onUngroup} />
      </div>
      <span className="font-mono text-[11px] text-muted">{view.members.length} node</span>
      <Handle type="source" position={Position.Right} id="out" style={{ top: inputY }} className="flow-handle flow-port-neutral" />
    </div>
  );
}
