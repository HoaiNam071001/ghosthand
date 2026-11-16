// Một điểm của node (design v3): nhãn trên + chữ neo bên phải; Số → children(menu) (ô toạ độ + neo, nút ⋯ cuối hàng có
// "Lấy toạ độ từ biến" – F5b); Biến → PointVarFields + nút "Dùng số cố định" ở đầu khối.
import { useT } from '../../i18n';
import { ReactNode, useMemo } from 'react';
import { anchorName, usesVar } from '../../anchor';
import { coordSources } from '../../flow/view';
import { addInput } from '../../scriptInputs';
import { setPointVar, useScript } from '../../store';
import { Step } from '../../types';
import { FieldMenu, MENU_ICON } from '../FieldMenu';
import PointVarFields from './PointVarFields';
import { SetPoint, useNodeVars } from './shared';

export default function PointSource({ step: s, index, setPoint, label, relative, children }: {
  step: Step; index: number; setPoint: SetPoint; label: ReactNode; relative?: boolean; children: (menu: ReactNode) => ReactNode;
}) {
  const t = useT();
  const { steps, start, edges, inputs } = useScript();
  const nodeVars = useNodeVars(s.id);
  const sources = useMemo(() => coordSources({ steps, start, edges }, s.id), [steps, start, edges, s.id]);
  const p = s.points[index];
  const byVar = !!p && usesVar(p);
  const menu = p && (
    <FieldMenu items={[{ label: t('ps.fromVar'), icon: MENU_ICON.variable, sub: t('ps.fromVarSub'), onClick: () => setPointVar(s.id, index, true) }]} />
  );
  return (
    <div className="group/field col-span-2 flex flex-col gap-1.5 text-muted">
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1">{label}</span>
        {p && (byVar ? (
          <button type="button" onClick={() => setPointVar(s.id, index, false)} className="rounded px-1.5 text-xs hover:bg-hover hover:text-ink">{t('ps.fixed')}</button>
        ) : !relative && <span className="text-xs">{anchorName(p)}</span>)}
      </span>
      {byVar ? (
        <PointVarFields point={p} onChange={(q) => setPoint(index, q)} relative={relative} inputs={inputs ?? []} nodeVars={nodeVars}
          sources={sources} onCreateInput={(key) => addInput({ key, label: key, type: 'number' })} />
      ) : children(menu)}
    </div>
  );
}
