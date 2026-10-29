// "Lưu thành node của tôi" (bước 55 M5): đặt tên + chọn icon, lưu server / tool / đối số đang điền làm mẫu ở mục Của tôi
// của bảng thêm node. Ô để trống = chỗ điền sau khi thả node vào canvas.
import { useState } from 'react';
import { SaveCustomNode } from '../../../wailsjs/go/main/App';
import { store } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import IconPicker from '../palette/IconPicker';
import { DEFAULT_CUSTOM_ICON } from '../palette/customIcons';
import { Step } from '../../types';
import { errText, hint } from './shared';

export default function MCPSaveCustom({ step: s, toolTitle }: { step: Step; toolTitle: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_CUSTOM_ICON);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const save = () => SaveCustomNode(store.CustomNode.createFrom({ name: name.trim(), icon, server: s.mcpServer, tool: s.mcpTool, args: s.mcpArgs ?? '' }))
    .then(() => { setOpen(false); setErr(''); setMsg(`Đã lưu “${name.trim()}” – tìm ở mục Của tôi khi thêm node.`); })
    .catch((e) => setErr(errorText(e)));
  if (!open) {
    return (
      <div className="col-span-2 flex flex-col gap-1">
        <button onClick={() => { setName(s.name || toolTitle); setMsg(''); setOpen(true); }} className="self-start text-xs font-medium text-accent-text hover:underline">Lưu thành node của tôi</button>
        {msg && <span className={hint}>{msg}</span>}
      </div>
    );
  }
  return (
    <form className="col-span-2 flex flex-col gap-1.5 rounded-control border border-line p-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <span className="text-xs font-semibold">Lưu thành node của tôi</span>
      <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Tên node của tôi" autoFocus
        className="rounded-control border border-line bg-field px-2 py-1 text-[13px] outline-none focus:ring-focus" />
      <IconPicker value={icon} onChange={setIcon} />
      <span className={hint}>Lưu server, tool và đối số đã điền; ô để trống điền sau khi thả node vào canvas. Biến {'{{n1.output…}}'} trong đối số chỉ hợp với kịch bản có node đó.</span>
      {err && <span className={errText}>{err}</span>}
      <span className="flex gap-2 text-xs">
        <button type="submit" disabled={!name.trim()} className="btn-primary rounded-control px-2.5 py-1 disabled:opacity-40">Lưu</button>
        <button type="button" onClick={() => setOpen(false)} className="text-muted hover:underline">Huỷ</button>
      </span>
    </form>
  );
}
