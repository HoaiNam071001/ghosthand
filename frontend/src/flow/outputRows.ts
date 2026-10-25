// Output một node thành các dòng bảng: nhãn (mô tả của trường) + biến {{ref.output.key}} + giá trị (bước 50 C1).
import type { OutputField } from './view';
import { valueText } from './runOutputs';

export type OutputRow = { key: string; label: string; variable: string; value: string };

// fields: mô tả trường của loại node (outputsOf) – không có thì nhãn = tên trường. Trường có trong fields mà chưa có
// giá trị (node chưa chạy) cũng hiện, giá trị rỗng.
export function outputRows(ref: string, output: Record<string, unknown> | undefined, fields: OutputField[] = []): OutputRow[] {
  const desc = new Map(fields.map((f) => [f.key, f.desc]));
  const keys = [...new Set([...Object.keys(output ?? {}), ...(output ? [] : fields.map((f) => f.key))])];
  return keys.map((key) => ({
    key, label: desc.get(key) ?? key, variable: `{{${ref}.output.${key}}}`,
    value: output && key in output ? valueText(output[key]) : '',
  }));
}

export const outputJson = (output: Record<string, unknown>) => JSON.stringify(output, null, 2);
