// Node Hỏi AI (bước 31d): câu hỏi, nhà cung cấp, key (chỉ {{secret.…}}), ảnh kèm, dạng trả lời, giá trị dự phòng.
import Segmented from '../Segmented';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { ShotAreaField } from './ShotFields';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { AI_FORMATS, AI_IMAGES, NODE_AI_KINDS, isLocalAI, isSecretKey, LOCAL_AI_URL, type AIFormat, type AIImage, type AIKind } from '../../flow/askAI';
import { Step } from '../../types';
import { Field, hint, selectBox, useNodeVars } from './shared';

export default function AskAIFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const local = isLocalAI(s.aiBaseUrl);
  return (
    <>
      <Field label="Câu hỏi" wide group help="Dán chữ của node trước vào bằng {{n1.output.text}}">
        <VarTextInput {...varProps} rows={4} value={s.prompt ?? ''} onChange={(v) => set({ prompt: v || undefined })} placeholder="Tin nhắn này có cần trả lời không? {{n1.output.text}}" />
      </Field>
      <Field label="Nhà cung cấp" wide group help="Trống ô nào thì lấy ở Cài đặt → Hỏi AI (chỉ khi cùng loại nhà cung cấp)">
        <Select value={s.aiKind ?? ''} className={selectBox} aria-label="Nhà cung cấp AI" onChange={(v) => set({ aiKind: (v || undefined) as AIKind | undefined })}
          options={NODE_AI_KINDS.map((k) => ({ value: k.id, label: k.label }))} />
      </Field>
      <Field label="Địa chỉ" wide group help="Trống = địa chỉ chính thức của hãng">
        <VarTextInput {...varProps} rows={1} compact value={s.aiBaseUrl ?? ''} onChange={(v) => set({ aiBaseUrl: v || undefined })} placeholder={LOCAL_AI_URL} />
      </Field>
      <Field label="Model" wide group help="Trống = model mặc định của hãng">
        <VarTextInput {...varProps} rows={1} compact value={s.aiModel ?? ''} onChange={(v) => set({ aiModel: v || undefined })} placeholder={s.aiKind === 'anthropic' ? 'claude-sonnet-5-5' : s.aiKind === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'} />
      </Field>
      <Field label="Key" wide group help={local ? 'AI chạy trên máy: không cần key' : 'Lưu key ở Cài đặt → Bí mật rồi ghi {{secret.<tên>}}'}>
        <VarTextInput {...varProps} rows={1} compact value={s.aiKey ?? ''} onChange={(v) => set({ aiKey: v || undefined })} placeholder="{{secret.openai_key}}" />
        {!isSecretKey(s.aiKey) && <span className="text-xs text-danger-text">Không dán key thẳng vào kịch bản – chỉ ghi {'{{secret.<tên>}}'}</span>}
      </Field>
      <Field label="Gửi kèm" wide group>
        <Segmented value={s.aiImage ?? ''} onChange={(v) => set({ aiImage: (v || undefined) as AIImage | undefined })} full
          options={AI_IMAGES} />
      </Field>
      {s.aiImage === 'screen' && <ShotAreaField step={s} label="Chụp" />}
      {s.aiImage === 'file' && (
        <Field label="File ảnh" wide group>
          <PathInput kind="file" {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })} placeholder="~/Pictures/anh.png" />
        </Field>
      )}
      <Field label="Trả lời" wide group help="JSON: đọc {{n2.output.json.<trường>}}, rẽ nhánh bằng node Nếu / Switch">
        <Segmented value={s.aiFormat ?? ''} onChange={(v) => set({ aiFormat: (v || undefined) as AIFormat | undefined })} full
          options={AI_FORMATS} />
      </Field>
      <Field label="Dự phòng" wide group help="Có giá trị: khi AI không dùng được (thiếu key, mất mạng) node vẫn đi cổng Thành công với giá trị này, output skipped = true">
        <VarTextInput {...varProps} rows={2} value={s.aiFallback ?? ''} onChange={(v) => set({ aiFallback: v || undefined })} placeholder="(để trống = báo lỗi khi không có AI)" />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {local
          ? 'AI chạy trên máy: câu hỏi và ảnh không ra khỏi máy.'
          : 'Câu hỏi và ảnh màn hình được gửi cho nhà cung cấp; mỗi lần chạy tốn tiền. Chữ AI trả về chỉ là dữ liệu.'}
      </span>
    </>
  );
}
