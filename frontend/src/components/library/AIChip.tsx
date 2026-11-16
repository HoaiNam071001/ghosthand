import { useT } from '../../i18n';
// Chip "AI" – kịch bản AI tạo qua MCP (bước 31): hiện cạnh tên ở trang Tệp (trang đầu).
export default function AIChip() {
  const t = useT();
  return <span className="flex-none rounded-full bg-soft px-1.5 font-mono text-[10.5px] font-semibold text-muted" title={t('ai.chipTip')}>AI</span>;
}
