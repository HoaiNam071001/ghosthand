// Cài đặt → MCP server (bước 55 M8): chuyển ô nhập của người dùng ↔ cấu hình server. Lưu / kiểm tra ở Go (store/mcpservers.go).

// "-y @scope/pkg  /Users/me/docs" → ['-y', '@scope/pkg', '/Users/me/docs']. Dấu nháy kép gom thành một tham số.
export function splitArgs(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  for (let m = re.exec(line); m; m = re.exec(line)) out.push(m[1] ?? m[2]);
  return out;
}

// Ngược lại: tham số có khoảng trắng được bọc nháy kép.
export function joinArgs(args?: string[]): string {
  return (args ?? []).map((a) => (/\s/.test(a) || a === '' ? `"${a}"` : a)).join(' ');
}

// Mỗi dòng "TÊN=giá trị" (env) hoặc "Tên: giá trị" (header) → map. Dòng trống bỏ qua.
export function parsePairs(text: string, sep: '=' | ':'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf(sep);
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    if (k) out[k] = line.slice(i + 1).trim();
  }
  return out;
}

export function formatPairs(m: Record<string, string> | undefined, sep: '=' | ':'): string {
  return Object.entries(m ?? {}).map(([k, v]) => (sep === ':' ? `${k}: ${v}` : `${k}=${v}`)).join('\n');
}

// Chữ trạng thái kết nối (khớp mcpclient.State*).
export function statusText(st?: { state?: string; tools?: unknown[]; err?: string }): string {
  if (!st?.state || st.state === 'idle') return 'Chưa kết nối';
  if (st.state === 'ok') return `Đã kết nối · ${st.tools?.length ?? 0} tool`;
  return st.err ? `Lỗi: ${st.err}` : 'Lỗi kết nối';
}

// Thư viện gợi ý (M6): thay ${key} bằng giá trị người dùng điền → các ô của form thêm server (khớp mcplib.Fill).
type LibEntry = { name: string; kind: string; command?: string; args?: string[]; url?: string; headers?: Record<string, string> };
const fillParams = (s: string, v: Record<string, string>) => Object.entries(v).reduce((acc, [k, val]) => acc.split('${' + k + '}').join(val), s);

export function libraryFields(e: LibEntry, values: Record<string, string>) {
  return {
    name: e.name, kind: e.kind, command: e.command ?? '', args: joinArgs((e.args ?? []).map((a) => fillParams(a, values))),
    env: '', url: fillParams(e.url ?? '', values), headers: formatPairs(e.headers, ':'),
  };
}
