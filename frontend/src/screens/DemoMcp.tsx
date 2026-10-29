// Màn #demo-mcp (bước 55 M8): tab Cài đặt → MCP server + form đối số sinh từ schema, dữ liệu giả, không cần Go.
import { useState } from 'react';
import McpLibrary from '../components/settings/McpLibrary';
import McpServerForm, { EMPTY_DRAFT, ServerDraft } from '../components/settings/McpServerForm';
import McpServerList from '../components/settings/McpServerList';
import MCPSchemaForm from '../components/stepform/MCPSchemaForm';
import { DEMO_LIBRARY, DEMO_SCHEMA, DEMO_SERVERS } from '../demo/mcpDemo';
import { schemaFields } from '../flow/mcpSchema';

const none = () => {};

export default function DemoMcp() {
  const [draft, setDraft] = useState<ServerDraft | null>(null);
  const [args, setArgs] = useState('{"path":"/Users/ban/ghi-chu.txt"}');
  return (
    <div className="grid min-h-screen grid-cols-1 gap-6 bg-bg p-6 text-[13px] text-ink md:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4">
        <span className="font-semibold">Cài đặt → MCP server</span>
        <McpServerList list={DEMO_SERVERS} busy="" onReload={none} onEdit={none} onToggle={none} onRemove={none} />
        {draft
          ? <McpServerForm draft={draft} onChange={(p) => setDraft({ ...draft, ...p })} onSave={() => setDraft(null)} onCancel={() => setDraft(null)} />
          : <button onClick={() => setDraft(EMPTY_DRAFT)} className="btn-primary self-start rounded-control px-3 py-1.5">Thêm server</button>}
        <McpLibrary entries={DEMO_LIBRARY} onPick={(d) => setDraft(d)} onOpenSecrets={none} />
      </section>
      <section className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-4">
        <span className="font-semibold">Node Gọi tool MCP – form đối số từ inputSchema</span>
        <div className="grid grid-cols-2 gap-2">
          <MCPSchemaForm fields={schemaFields(DEMO_SCHEMA)} args={args} onChange={setArgs} varProps={{ inputs: [], nodeVars: [] }} />
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-control border border-line bg-field p-2 font-mono text-xs">{args || '(chưa có đối số)'}</pre>
      </section>
    </div>
  );
}
