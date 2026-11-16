// Giải thích mã lỗi bằng tiếng Anh cạnh lời báo của Go (Go giữ chữ Việt cho MCP) – chỉ hiện khi giao diện đang English.
import { useLang, useT } from '../../i18n';
import type { MsgKey } from '../../i18n/vi';

const CODES = ['not_found', 'http_status', 'network', 'mcp_error', 'ai_error', 'timeout', 'permission', 'invalid_input', 'cancelled', 'end', 'browser', 'exit_code', 'window_mismatch', 'web_dialog', 'internal'];

export default function ErrorHint({ code }: { code: string }) {
  const lang = useLang();
  const t = useT();
  if (lang !== 'en' || !CODES.includes(code)) return null;
  return <div className="mt-1 text-xs opacity-85">{t(`eh.${code}` as MsgKey)}</div>;
}
