// Nhúng kịch bản khác (bước 39 G2): Go ghép (script.Embed), ở đây áp kết quả vào kịch bản đang soạn qua updateScript.
import { EmbedSample, EmbedScriptFile } from '../../wailsjs/go/main/App';
import { model } from '../../wailsjs/go/models';
import { Script } from '../types';
import { getEditor, setEditor, updateScript } from './editor';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Embedded = { script: Script; groupId: string; nodes: number; renamedInput?: Record<string, string>; droppedEnds: number };

async function embed(run: (parent: model.Script) => Promise<unknown>) {
  try {
    const res = (await run(model.Script.createFrom(getEditor().script))) as Embedded;
    if (!res.nodes) return; // huỷ hộp thoại chọn file
    const { steps, edges, start, inputs, groups } = res.script;
    updateScript({ steps, edges, start, inputs, groups });
    const renamed = Object.entries(res.renamedInput ?? {}).map(([a, b]) => `${a} → ${b}`);
    setEditor({
      picked: groups?.find((g) => g.id === res.groupId)?.members ?? [],
      notice: `Đã nhúng ${res.nodes} node – nối khung vào flow để chạy${renamed.length ? `; input trùng tên đổi: ${renamed.join(', ')}` : ''}`,
    });
  } catch (e) {
    setEditor({ notice: `Không nhúng được: ${errText(e)}` });
  }
}

export const embedFile = () => embed((p) => EmbedScriptFile(p));
export const embedSample = (id: string) => embed((p) => EmbedSample(p, id));
