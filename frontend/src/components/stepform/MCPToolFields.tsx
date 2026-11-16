// Node Gọi tool MCP (bước 55 M4): chọn server → tool (tìm, mô tả) → form đối số sinh từ inputSchema (hoặc ô JSON) → Chạy thử.
// Mô tả tool là dữ liệu của server ngoài: chỉ hiện cho người dùng.
import { useT } from '../../i18n';
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
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const { servers, reload } = useMCPServers();
  const [query, setQuery] = useState('');
  const [rawJSON, setRawJSON] = useState(false);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };

  const server = servers.find((x) => x.id === s.mcpServer);
  const tools = server?.status?.tools ?? [];
  const tool = tools.find((x) => x.name === s.mcpTool);
  const q = query.trim().toLowerCase();
  const shown = q ? tools.filter((x) => `${x.name} ${x.title ?? ''}`.toLowerCase().includes(q)) : tools;
  const fields = schemaFields(tool?.inputSchema);
  const args = parseArgs(s.mcpArgs);
  const useForm = !rawJSON && fields.length > 0 && args !== null;
  const argsErr = mcpArgsError(s.mcpArgs);
  const missing = tool ? missingRequired(fields, args) : [];

  return (
    <>
      <Field label="Server" wide group help={server ? statusText(server.status) : undefined}>
        <Select value={s.mcpServer ?? ''} className={selectBox} aria-label={t('mcp.server')} placeholder={s.mcpServer ? t('mcp.noServer', { s: s.mcpServer }) : t('mcp.pickServer')}
          onChange={(id) => set({ mcpServer: id || undefined, mcpTool: undefined, mcpArgs: undefined })}
          options={servers.map((x) => ({ value: x.id, label: x.name, sub: x.enabled ? undefined : t('mcp.off') }))} />
        {servers.length === 0 && (
          <button onClick={() => openSettings('servers')} className="self-start text-xs text-accent-text underline">{t('mcp.none')}</button>
        )}
        {server && tools.length === 0 && <span className={hint}>{t('mcp.noTools')} <button className="underline" onClick={reload}>{t('mcp.refreshHere')}</button>.</span>}
      </Field>
      {server && tools.length > 0 && (
        <Field label="Tool" wide group help={tool?.description || undefined}>
          {tools.length >= SEARCH_FROM && <input className={fieldBox} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('mcp.search')} aria-label={t('mcp.search')} />}
          <Select value={s.mcpTool ?? ''} className={selectBox} aria-label={t('mcp.tool')} placeholder={s.mcpTool ? t('mcp.noTool', { s: s.mcpTool }) : t('mcp.pickTool')}
            onChange={(name) => set({ mcpTool: name || undefined, mcpArgs: undefined })}
            options={shown.map((x) => ({ value: x.name, label: x.title || x.name, sub: x.readOnly ? t('mcp.readOnly') : undefined }))} />
        </Field>
      )}
      {(!server || tools.length === 0) && (
        <Field label="Tool" wide group help={t('mcp.toolHelp')}>
          <VarTextInput {...varProps} rows={1} compact value={s.mcpTool ?? ''} onChange={(v) => set({ mcpTool: v || undefined })} placeholder="read_text_file" />
        </Field>
      )}
      {useForm
        ? <MCPSchemaForm fields={fields} args={s.mcpArgs ?? ''} onChange={(a) => set({ mcpArgs: a || undefined })} varProps={varProps} />
        : (
          <Field label={t('mcp.args')} wide group help={t('mcp.argsHelp')}>
            <VarTextInput {...varProps} rows={4} value={s.mcpArgs ?? ''} onChange={(v) => set({ mcpArgs: v || undefined })} placeholder={'{"path":"{{n1.output.text}}"}'} />
            {argsErr && <span className={errText}>{argsErr}</span>}
          </Field>
        )}
      {fields.length > 0 && args !== null && (
        <button onClick={() => setRawJSON(!rawJSON)} className="col-span-2 self-start text-xs text-muted underline">{rawJSON ? t('mcp.useForm') : t('mcp.editJson')}</button>
      )}
      {missing.length > 0 && <span className={`col-span-2 ${errText}`}>{t('mcp.missing', { list: missing.join(', ') })}</span>}
      {s.mcpServer && s.mcpTool && <MCPToolTest server={s.mcpServer} tool={s.mcpTool} args={s.mcpArgs ?? ''} />}
      {s.mcpServer && s.mcpTool && <MCPSaveCustom step={s} toolTitle={tool?.title || s.mcpTool} />}
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('mcp.note')}
      </span>
    </>
  );
}
