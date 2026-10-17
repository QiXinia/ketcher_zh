import type { ReStruct } from 'application/render';
import type { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { parseAtomSproutLabel } from 'domain/helpers/atomSproutLabel';
import { validateAtomSproutTarget } from './atomSprout';
import { fromAtomsAttrs } from './atom';
import { fromTemplateOnAtom } from './template';
import { atomForNewBond } from './utils';

/** Replace a label, preserving the atom ID and its external bond. Nicknames
 * have one supported attachment point; do not route several external bonds
 * to that point or discard isotope/charge/query information from the target. */
export function fromSelectedAtomLabelEdit(
  restruct: ReStruct,
  atomIds: readonly number[],
  label: string,
  nickname?: { struct: Struct; attachmentAtomId: number },
) {
  const { pseudo: _pseudo, ...attributes } = parseAtomSproutLabel(label);
  const { sourceId, struct, source } = validateAtomSproutTarget(restruct, atomIds);
  if (source.attachmentPoints) throw new Error('请先移除原子的连接点再编辑标签');
  if (!nickname) {
    return {
      inverseAction: fromAtomsAttrs(restruct, sourceId, { ...attributes, alias: null }, false),
      atoms: [sourceId], bonds: [], targetAtomId: sourceId,
    };
  }

  const neighbors = struct.atomGetNeighbors(sourceId) ?? [];
  if (neighbors.length > 1 || neighbors.some(({ bid }) => struct.bonds.get(bid)?.type !== 1)) {
    throw new Error('当前昵称标签仅支持孤立原子或一个外接单键，请使用多连接点模板处理其他情况');
  }
  if (source.isotope || source.charge || source.radical || source.isotopicAbundance ||
      source.explicitValence !== -1 || source.implicitHCount !== null || source.hCount ||
      source.stereoLabel || source.stereoParity || source.abnormalValence ||
      source.ringBondCount || source.substitutionCount || source.unsaturatedAtom ||
      Object.values(source.queryProperties).some(value => value !== null && value !== undefined)) {
    throw new Error('目标原子含同位素、电荷、价态或查询属性，请先明确处理这些属性再替换为昵称');
  }

  const atomMap = new Map<number, number>();
  const fragment = nickname.struct.clone(null, null, true, atomMap);
  const aid = atomMap.get(nickname.attachmentAtomId);
  const groups = [...fragment.sgroups.values()].filter(group =>
    group.type === 'SUP' && group.atoms.length === fragment.atoms.size);
  if (aid === undefined || !fragment.atoms.size || fragment.atoms.size > 500 ||
      fragment.findConnectedComponents(true).length !== 1 || fragment.rgroups.size ||
      [...fragment.atoms.values()].some(atom => atom.rglabel || !Number.isFinite(atom.pp.x) || !Number.isFinite(atom.pp.y)) ||
      groups.length !== 1 || groups[0].getAttachmentPoints().length !== 1 ||
      groups[0].getAttachmentAtomId() !== aid || groups[0].getAttachmentPoints()[0].leaveAtomId !== undefined) {
    throw new Error('昵称标签需要一个有效的相连片段和单一连接点');
  }
  const pivot = fragment.atoms.get(aid)!;
  if (pivot.aam && source.aam && pivot.aam !== source.aam) throw new Error('昵称与目标原子的反应映射冲突');
  pivot.aam = source.aam || pivot.aam;
  pivot.invRet = source.invRet;
  pivot.exactChangeFlag = source.exactChangeFlag;
  const occupiedMaps = new Set([...struct.atoms.entries()].filter(([id]) => id !== sourceId).map(([, atom]) => atom.aam).filter(Boolean));
  const newMaps = new Set<number>();
  for (const atom of fragment.atoms.values()) {
    if (atom.aam && (occupiedMaps.has(atom.aam) || newMaps.has(atom.aam))) throw new Error('昵称中的反应映射与当前结构重复');
    if (atom.aam) newMaps.add(atom.aam);
  }
  fragment.rescale();
  const center = new Vec2();
  fragment.atoms.forEach(atom => center.add_(atom.pp));
  const midpoint = center.scaled(1 / fragment.atoms.size);
  const angle0 = Math.atan2(midpoint.y - pivot.pp.y, midpoint.x - pivot.pp.x);
  const native = atomForNewBond(restruct, sourceId, { type: 1 });
  const base = Math.atan2(native.pos.y - source.pp.y, native.pos.x - source.pp.x);
  const angle = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI]
    .map(offset => base + offset).find(candidate => [...fragment.atoms.entries()].every(([id, atom]) => {
      if (id === aid) return true;
      const point = atom.pp.sub(pivot.pp).rotate(candidate - angle0).add(source.pp);
      return [...struct.atoms.entries()].every(([id, existing]) => id === sourceId || Vec2.dist(existing.pp, point) >= 0.1);
    }));
  if (angle === undefined) throw new Error('昵称片段位置与既有原子重叠，请先调整布局');
  // All checks above are read-only. The native replacement keeps external
  // bonds, their IDs/direction/stereo and the original anchor's coordinates.
  const [inverseAction, added] = fromTemplateOnAtom(
    restruct, { molecule: fragment, aid, angle0 }, sourceId, angle, false,
  );
  return { inverseAction, atoms: added.atoms, bonds: added.bonds, targetAtomId: sourceId };
}
