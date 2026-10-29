// Dữ liệu giả cho màn #demo-mcp (bước 55 M8) – không cần Go.
import { main, mcplib } from '../../wailsjs/go/models';

export const DEMO_SERVERS = [
  { id: 's1', name: 'Filesystem', kind: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/ban/Documents'], enabled: true,
    status: { state: 'ok', tools: [{ name: 'read_text_file' }, { name: 'write_file' }, { name: 'list_directory' }], at: 0 } },
  { id: 's2', name: 'GitHub', kind: 'http', url: 'https://api.githubcopilot.com/mcp/', headers: { Authorization: 'Bearer {{secret.github_token}}' }, enabled: true,
    status: { state: 'error', code: 'connect', err: 'không nối được: 401 Unauthorized', at: 0 } },
  { id: 's3', name: 'Fetch', kind: 'stdio', command: 'uvx', args: ['mcp-server-fetch'], enabled: false, status: { state: 'idle' } },
].map((s) => main.MCPServerView.createFrom(s));

export const DEMO_LIBRARY = [
  { id: 'filesystem', name: 'Filesystem', desc: 'Đọc / ghi / tìm file trong thư mục bạn cho phép (server mẫu chính thức).', kind: 'stdio', command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '${dir}'], params: [{ key: 'dir', label: 'Thư mục được phép', placeholder: '/Users/ban/Documents' }],
    warn: 'Tool ghi / xoá file chỉ trong thư mục đã chọn; app hỏi trước mỗi lần.', available: true },
  { id: 'fetch', name: 'Fetch', desc: 'Tải trang web về dạng chữ / Markdown.', kind: 'stdio', command: 'uvx', args: ['mcp-server-fetch'], available: false,
    installHint: 'Cần uv (https://docs.astral.sh/uv) – cài xong mở lại Ghosthand.' },
  { id: 'github', name: 'GitHub', desc: 'Repo, issue, pull request qua server GitHub chính thức (từ xa).', kind: 'http', url: 'https://api.githubcopilot.com/mcp/',
    secrets: ['github_token'], available: true, thirdParty: false },
].map((e) => mcplib.Entry.createFrom(e));

export const DEMO_SCHEMA = {
  type: 'object', required: ['path'],
  properties: {
    path: { type: 'string', description: 'Đường dẫn file cần đọc' },
    head: { type: 'integer', description: 'Chỉ đọc N dòng đầu' },
    encoding: { type: 'string', enum: ['utf-8', 'utf-16'] },
    follow: { type: 'boolean' },
    tags: { type: 'array', items: { type: 'string' } },
    options: { type: 'object' },
  },
};
