// Ghi macro (bước 24): Go bắt chuột / phím toàn cục, F9 dừng (event record:done); ở đây ghép kết quả vào kịch bản
// qua updateScript như Nhúng kịch bản.
import { FinishRecording, StartRecording } from '../../wailsjs/go/main/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { model } from '../../wailsjs/go/models';
import { Script } from '../types';
import { inWails } from '../windowMode';
import { getEditor, setEditor, updateScript } from './editor';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Embedded = { script: Script; groupId: string; nodes: number };

async function finish() {
  try {
    const res = (await FinishRecording(model.Script.createFrom(getEditor().script))) as Embedded;
    if (!res.nodes) return setEditor({ notice: 'Không ghi được thao tác nào' });
    const { steps, edges, start, inputs, groups } = res.script;
    updateScript({ steps, edges, start, inputs, groups });
    setEditor({
      picked: groups?.find((g) => g.id === res.groupId)?.members ?? [],
      notice: `Đã ghi ${res.nodes} node – nối khung vào flow để chạy`,
    });
  } catch (e) {
    setEditor({ notice: `Không ghi được: ${errText(e)}` });
  }
}

if (inWails) EventsOn('record:done', finish);

export async function startRecording() {
  try {
    await StartRecording();
  } catch (e) {
    setEditor({ notice: `Không ghi được: ${errText(e)}` });
  }
}
