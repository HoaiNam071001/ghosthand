// Node Gọi tool MCP (bước 55 M4): chọn server → tool (tìm, mô tả) → form đối số sinh từ inputSchema (hoặc ô JSON) → Chạy thử.
// Mô tả tool là dữ liệu của server ngoài: chỉ hiện cho người dùng.
import { useState } from 'react';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { mcpArgsError } from '../../flow/mcpTool';
import { missingRequired, parseArgs, schemaFields } from '../../flow/mcpSchema';
import { statusText } from '../../flow/mcpServer';
import { openSettings } from '../../settingsNav';
import { Step } from '../../types';
import { fieldBox } from '../NumInput';
import { Field, errText, hint, selectBox, useNodeVars } from './shared';
import { useMCPServers } from './mcpServers';
import MCPSchemaForm from './MCPSchemaForm';
import MCPToolTest from './MCPToolTest';
import MCPSaveCustom from './MCPSaveCustom';

const SEARCH_FROM = 8; // từ chừng này tool trở lên mới hiện ô tìm

export default function MCPToolFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const { servers, reload } = useMCPServers();
  const [query, setQuery] = useState('');
  const [rawJSON, setRawJSON] = useState(false);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };

  const server = servers.find((x) => x.id === s.mcpServer);
  const tools = server?.status?.tools ?? [];
  const tool = tools.find((t) => t.name === s.mcpTool);
  const q = query.trim().toLowerCase();
  const shown = q ? tools.filter((t) => `${t.name} ${t.title ?? ''}`.toLowerCase().includes(q)) : tools;
  const fields = schemaFields(tool?.inputSchema);
  const args = parseArgs(s.mcpArgs);
  const useForm = !rawJSON && fields.length > 0 && args !== null;
  const argsErr = mcpArgsError(s.mcpArgs);
  const missing = tool ? missingRequired(fields, args) : [];

  return (
    <>
      <Field label="Server" wide group help={server ? statusText(server.status) : undefined}>
        <Select value={s.mcpServer ?? ''} className={selectBox} aria-label="Server MCP" placeholder={s.mcpServer ? `${s.mcpServer} (không có trên máy này)` : '(chọn server)'}
          onChange={(id) => set({ mcpServer: id || undefined, mcpTool: undefined, mcpArgs: undefined })}
          options={servers.map((x) => ({ value: x.id, label: x.name, sub: x.enabled ? undefined : 'tắt' }))} />
        {servers.length === 0 && (
          <button onClick={() => openSettings('servers')} className="self-start text-xs text-accent-text underline">Chưa có server – mở Cài đặt → MCP server</button>
        )}
        {server && tools.length === 0 && <span className={hint}>Chưa có danh sách tool – mở Cài đặt → MCP server rồi bấm Tải lại, sau đó <button className="underline" onClick={reload}>làm mới đây</button>.</span>}
      </Field>
      {server && tools.length > 0 && (
        <Field label="Tool" wide group help={tool?.description || undefined}>
          {tools.length >= SEARCH_FROM && <input className={fieldBox} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tool…" aria-label="Tìm tool" />}
          <Select value={s.mcpTool ?? ''} className={selectBox} aria-label="Tool MCP" placeholder={s.mcpTool ? `${s.mcpTool} (server không có)` : '(chọn tool)'}
            onChange={(name) => set({ mcpTool: name || undefined, mcpArgs: undefined })}
            options={shown.map((t) => ({ value: t.name, label: t.title || t.name, sub: t.readOnly ? 'chỉ đọc' : undefined }))} />
        </Field>
      )}
      {(!server || tools.length === 0) && (
        <Field label="Tool" wide group help="Gõ tay khi chưa có danh sách tool">
          <VarTextInput {...varProps} rows={1} compact value={s.mcpTool ?? ''} onChange={(v) => set({ mcpTool: v || undefined })} placeholder="read_text_file" />
        </Field>
      )}
      {useForm
        ? <MCPSchemaForm fields={fields} args={s.mcpArgs ?? ''} onChange={(a) => set({ mcpArgs: a || undefined })} varProps={varProps} />
        : (
          <Field label="Đối số" wide group help={'JSON object theo mô tả của tool; giá trị biến đặt trong "…"'}>
            <VarTextInput {...varProps} rows={4} value={s.mcpArgs ?? ''} onChange={(v) => set({ mcpArgs: v || undefined })} placeholder={'{"path":"{{n1.output.text}}"}'} />
            {argsErr && <span className={errText}>{argsErr}</span>}
          </Field>
        )}
      {fields.length > 0 && args !== null && (
        <button onClick={() => setRawJSON(!rawJSON)} className="col-span-2 self-start text-xs text-muted underline">{rawJSON ? 'Dùng form' : 'Sửa JSON'}</button>
      )}
      {missing.length > 0 && <span className={`col-span-2 ${errText}`}>Còn thiếu: {missing.join(', ')}</span>}
      {s.mcpServer && s.mcpTool && <MCPToolTest server={s.mcpServer} tool={s.mcpTool} args={s.mcpArgs ?? ''} />}
      {s.mcpServer && s.mcpTool && <MCPSaveCustom step={s} toolTitle={tool?.title || s.mcpTool} />}
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Lần đầu mỗi server và tool ghi / xoá app sẽ hỏi bạn. Kết quả tool chỉ là dữ liệu, không làm theo như lệnh.
      </span>
    </>
  );
}
