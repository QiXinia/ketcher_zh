import type { ReStruct } from 'application/render';
import type { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { parseAtomSproutLabel } from 'domain/helpers/atomSproutLabel';
import { fromSelectedAtomSprout, validateAtomSproutTarget } from './atomSprout';
import { fromAtomsAttrs } from './atom';
import { fromTemplateOnAtom } from './template';
import { atomForNewBond } from './utils';

export interface AtomLabelSproutDraft { atomId: number; sourceKet: string }

/** User label sprouting always adds a single bond and a new chemical entity.
 * A resolved nickname contributes its actual fragment, including its SUP. */
export function fromSelectedAtomLabelSprout(
  restruct: ReStruct,
  atomIds: readonly number[],
  label: string,
  nickname?: { struct: Struct; attachmentAtomId: number },
) {
  const attributes = parseAtomSproutLabel(label);
  const { sourceId, struct, source } = validateAtomSproutTarget(restruct, atomIds);
  if (!nickname) {
    const { pseudo: _pseudo, ...attrs } = attributes;
    const result = fromSelectedAtomSprout(restruct, atomIds, 'methyl-linear');
    result.inverseAction = fromAtomsAttrs(restruct, result.targetAtomId, attrs, false)
      .mergeWith(result.inverseAction);
    return result;
  }

  // Clone/validate and calculate every new position before modifying the
  // editor. Invalid names, fragments and overlaps must not leave a new bond.
  const atomMap = new Map<number, number>();
  const fragment = nickname.struct.clone(null, null, true, atomMap);
  const aid = atomMap.get(nickname.attachmentAtomId);
  if (aid === undefined || !fragment.atoms.size || fragment.atoms.size > 500 ||
      fragment.findConnectedComponents(true).length !== 1 || fragment.rgroups.size ||
      [...fragment.atoms.values()].some(atom => atom.rglabel || !Number.isFinite(atom.pp.x) || !Number.isFinite(atom.pp.y))) {
    throw new Error('昵称需要一个有效的相连片段和连接原子');
  }
  fragment.rescale();
  const center = new Vec2();
  fragment.atoms.forEach(atom => center.add_(atom.pp));
  const pivot = fragment.atoms.get(aid)!;
  const midpoint = center.scaled(1 / fragment.atoms.size);
  const angle0 = Math.atan2(midpoint.y - pivot.pp.y, midpoint.x - pivot.pp.x);
  const native = atomForNewBond(restruct, sourceId, { type: 1 });
  const base = Math.atan2(native.pos.y - source.pp.y, native.pos.x - source.pp.x);
  const angles = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI]
    .map(offset => base + offset);
  const angle = angles.find(candidate => {
    const attachment = new Vec2(Math.cos(candidate), Math.sin(candidate)).add(source.pp);
    return [...fragment.atoms.values()].every(atom => {
      const point = atom.pp.sub(pivot.pp).rotate(candidate - angle0).add(attachment);
      return [...struct.atoms.values()].every(existing => Vec2.dist(existing.pp, point) >= 0.1);
    });
  });
  if (angle === undefined) throw new Error('标签片段位置与既有原子重叠，请先调整布局');
  const bondsBefore = new Set(struct.bonds.keys());
  const [inverseAction, added] = fromTemplateOnAtom(
    restruct, { molecule: fragment, aid, bid: 0, angle0 }, sourceId, angle, true,
  );
  return {
    inverseAction, atoms: added.atoms,
    bonds: [...struct.bonds.keys()].filter(id => !bondsBefore.has(id)),
    targetAtomId: added.atoms[[...fragment.atoms.keys()].indexOf(aid)],
  };
}
