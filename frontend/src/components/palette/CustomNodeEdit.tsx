// Sửa tên / icon hoặc xoá một node của tôi – hiện ở khung mô tả của bảng thêm node (bước 55 M5).
import { useState } from 'react';
import { DeleteCustomNode, SaveCustomNode } from '../../../wailsjs/go/main/App';
import { store } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import { customIcon } from './customIcons';
import IconPicker from './IconPicker';

export default function CustomNodeEdit({ node, onChanged }: { node: store.CustomNode; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(node.name);
  const [icon, setIcon] = useState(customIcon(node.icon));
  const [err, setErr] = useState('');
  const done = () => { setOpen(false); onChanged(); };
  const save = () => SaveCustomNode(store.CustomNode.createFrom({ ...node, name: name.trim(), icon })).then(done).catch((e) => setErr(errorText(e)));
  const remove = () => DeleteCustomNode(node.id).then(done).catch((e) => setErr(errorText(e)));
  if (!open) {
    return (
      <span className="flex gap-3 text-xs">
        <button onClick={() => setOpen(true)} className="font-medium text-accent-text hover:underline">Sửa</button>
        <button onClick={remove} className="font-medium text-danger-text hover:underline">Xoá</button>
      </span>
    );
  }
  return (
    <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Tên node" autoFocus
        className="rounded-control border border-line bg-field px-2 py-1 text-[13px] outline-none focus:ring-focus" />
      <IconPicker value={icon} onChange={setIcon} />
      {err && <span className="text-xs text-danger-text">{err}</span>}
      <span className="flex gap-2 text-xs">
        <button type="submit" disabled={!name.trim()} className="btn-primary rounded-control px-2.5 py-1 disabled:opacity-40">Lưu</button>
        <button type="button" onClick={() => setOpen(false)} className="text-muted hover:underline">Huỷ</button>
      </span>
    </form>
  );
}
