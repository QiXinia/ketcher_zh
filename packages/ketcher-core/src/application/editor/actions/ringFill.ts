import { RingFill, getLoopRing } from 'domain/entities/ringFill';
import type { EditorSelection } from '../editor.types';
import type { ReStruct } from '../../render';
import { RingFillSet } from '../operations/RingFillSet';
import { Action } from './action';

/** Complete atom or bond selections select a ring; a single shared bond does not. */
export function fromSelectedRingFill(
  restruct: ReStruct,
  selection: EditorSelection | null,
  color?: string,
): { action: Action; ringCount: number } {
  if (color !== undefined && !/^#[\da-f]{6}$/i.test(color)) {
    throw new Error('环填充颜色必须是六位十六进制颜色');
  }
  const struct = restruct.molecule;
  const atoms = new Set(selection?.atoms ?? []);
  const bonds = new Set(selection?.bonds ?? []);
  struct.atoms.forEach((atom, id) => {
    if (selection?.frags?.includes(atom.fragment)) atoms.add(id);
  });
  (selection?.sgroups ?? []).forEach((id) => {
    struct.sgroups.get(id)?.atoms.forEach((atom) => atoms.add(atom));
  });
  const action = new Action();
  let ringCount = 0;
  struct.loops.forEach((loop) => {
    const ring = getLoopRing(struct, loop);
    if (!ring || ring.atoms.length < 3) return;
    if (!ring.atoms.every((id) => atoms.has(id)) &&
        !ring.bonds.every((id) => bonds.has(id))) return;
    ringCount++;
    const existingId = struct.ringFills.find((_id, fill) =>
      fill.matches(ring.atoms, ring.bonds),
    );
    action.addOp(
      new RingFillSet(color ? new RingFill({ ...ring, color }) : undefined,
        existingId ?? undefined),
      restruct,
    );
  });
  if (!ringCount) throw new Error('请完整选择需要填充的环（全部环原子或环键）');
  // Keep action creators side-effect free.  The React editor performs the
  // action and records the returned inverse, matching the other editor APIs.
  return { action, ringCount };
}

export function fromRingFillClear(restruct: ReStruct): Action {
  const action = new Action();
  restruct.molecule.ringFills.forEach((_fill, id) => {
    action.addOp(new RingFillSet(undefined, id));
  });
  return action;
}
