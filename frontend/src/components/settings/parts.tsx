// Mảnh dùng chung của hộp Cài đặt: khối chữ mono, nút chép.
import { useT } from '../../i18n';
import { ReactNode, useState } from 'react';
import { Copy } from '../icons';

export function SettingCode({ children }: { children: ReactNode }) {
  return <code className="block max-h-40 overflow-auto rounded-control bg-field px-2 py-1.5 font-mono text-xs break-all whitespace-pre-wrap text-ink">{children}</code>;
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); });
  return (
    <button onClick={copy} aria-label={label} title={copied ? t('cp.copied') : label}
      className="grid h-8 w-8 flex-none place-items-center rounded-control border border-line hover:bg-hover"><Copy className="h-3.5 w-3.5" /></button>
  );
}
