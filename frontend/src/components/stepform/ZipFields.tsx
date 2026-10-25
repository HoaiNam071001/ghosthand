// Node Nén / giải nén (bước 43 S8): nguồn, đích, mẫu tên file khi nén thư mục.
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { ZIP_OPS, type ZipOp } from '../../flow/zip';
import { Step } from '../../types';
import { Field, hint, useNodeVars } from './shared';

export default function ZipFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const extract = s.zipOp === 'extract';
  return (
    <>
      <Field label="Làm gì" wide group>
        <Segmented value={s.zipOp ?? ''} full label="Thao tác nén" onChange={(v) => set({ zipOp: (v || undefined) as ZipOp | undefined })} options={ZIP_OPS} />
      </Field>
      <Field label={extract ? 'File .zip' : 'File / thư mục cần nén'} wide group help="~ = thư mục người dùng · đường dẫn tương đối tính từ thư mục người dùng">
        <PathInput kind={extract ? 'file' : 'any'} {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })} placeholder={extract ? '~/Downloads/goi.zip' : '~/Documents/bao-cao'} />
      </Field>
      <Field label={extract ? 'Giải nén vào' : 'Lưu thành'} wide group help={extract ? 'Trống = thư mục tên như file zip, cạnh nó' : 'Trống = tên nguồn + .zip. Ghi đè file có sẵn'}>
        <PathInput kind={extract ? 'folder' : 'save'} {...varProps} value={s.zipTo ?? ''} onChange={(v) => set({ zipTo: v || undefined })} placeholder={extract ? '~/Documents/goi' : '~/Documents/bao-cao.zip'} />
      </Field>
      {!extract && (
        <Field label="Chỉ nén file tên" wide group help="Khi nguồn là thư mục: vd *.pdf · trống = tất cả (kể cả thư mục con)">
          <VarTextInput {...varProps} value={s.filePattern ?? ''} onChange={(v) => set({ filePattern: v || undefined })} placeholder="*.pdf" />
        </Field>
      )}
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {extract ? 'Ghi đè file trùng tên; từ chối file zip có mục thoát ra ngoài thư mục đích. ' : 'Nén thư mục giữ tên thư mục làm gốc trong zip. '}
        Node sau dùng {`{{${s.ref}.output.path}}`}, {`{{${s.ref}.output.count}}`}.
      </span>
    </>
  );
}
