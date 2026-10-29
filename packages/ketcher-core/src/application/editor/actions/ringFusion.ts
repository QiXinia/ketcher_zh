import type { ReStruct } from 'application/render';
import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { fromTemplateOnBondAction } from './template';
import utils from '../shared/utils';

export type RingFusionKind =
  | 3 | 4 | 5 | 6 | 7 | 8
  | 'benzene' | 'cyclopentadiene' | 'chair-left' | 'chair-right';

/** Carbon skeletons only. Chair coordinates are a 2D projection, not stereo. */
export function createFusionRing(kind: RingFusionKind): Struct {
  const size = typeof kind === 'number' ? kind : kind === 'cyclopentadiene' ? 5 : 6;
  if (![3, 4, 5, 6, 7, 8, 'benzene', 'cyclopentadiene', 'chair-left', 'chair-right'].includes(kind)) {
    throw new Error('不支持的稠合环类型');
  }
  const ring = new Struct();
  ring.name = kind === 'benzene' ? 'Benzene' : kind === 'cyclopentadiene' ? 'Cyclopentadiene' : '';
  // The two chair tools in ChemDraw are mirror projections of the same ring.
  const chair = [
    [-0.5, -0.25], [0.625, -0.5], [1.125, 0.5],
    [0.5, 0.25], [-0.625, 0.5], [-1.125, -0.5],
  ];
  const radius = 1 / (2 * Math.sin(Math.PI / size));
  for (let index = 0; index < size; index++) {
    const point = typeof kind === 'string' && kind.startsWith('chair-')
      ? new Vec2(chair[index][0], chair[index][1] * (kind === 'chair-right' ? -1 : 1))
      : new Vec2(radius * Math.cos(2 * Math.PI * index / size), radius * Math.sin(2 * Math.PI * index / size));
    ring.atoms.add(new Atom({ label: 'C', pp: point }));
    const double = kind === 'benzene' ? index % 2 === 0 : kind === 'cyclopentadiene' && [1, 3].includes(index);
    ring.bonds.add(new Bond({ begin: index, end: (index + 1) % size, type: double ? 2 : 1 }));
  }
  return ring;
}

/** Mutates through native operations and returns the inverse action for history. */
export function fromSelectedRingFusion(
  restruct: ReStruct,
  bondIds: readonly number[],
  kind: RingFusionKind,
) {
  const ring = createFusionRing(kind);
  const struct = restruct.molecule;
  if (bondIds.length !== 1 || !Number.isInteger(bondIds[0])) {
    throw new Error('请只选择一条键来稠合环');
  }
  const bondId = bondIds[0];
  const bond = struct.bonds.get(bondId);
  const begin = bond && struct.atoms.get(bond.begin);
  const end = bond && struct.atoms.get(bond.end);
  if (!bond || !begin || !end) throw new Error('所选键已失效');
  // Query bonds keep their existing predicate on the shared edge. Do not
  // infer a concrete bond order or propagate that predicate to new edges.
  const fusableBondTypes = [
    Bond.PATTERN.TYPE.SINGLE,
    Bond.PATTERN.TYPE.DOUBLE,
    Bond.PATTERN.TYPE.AROMATIC,
    Bond.PATTERN.TYPE.SINGLE_OR_DOUBLE,
    Bond.PATTERN.TYPE.SINGLE_OR_AROMATIC,
    Bond.PATTERN.TYPE.DOUBLE_OR_AROMATIC,
    Bond.PATTERN.TYPE.ANY,
  ];
  if (!fusableBondTypes.includes(bond.type)) {
    throw new Error('稠合环需要单键、双键、芳香键或查询键');
  }
  if (begin.sgs.size || end.sgs.size) throw new Error('请先解除连接原子所在的 S-group，再稠合环');
  if (Vec2.dist(begin.pp, end.pp) < 0.01) throw new Error('所选键的长度过小，请先整理结构');

  if (bond.type === Bond.PATTERN.TYPE.AROMATIC && !bond.customQuery) {
    // Fusing benzene onto an aromatic edge extends the aromatic system.
    // Keeping the Kekule template here would overbond the fused carbons.
    // Cyclopentadiene contributes one additional double bond (indene),
    // while the saturated templates contribute only single bonds.
    ring.bonds.forEach((edge, id) => {
      const type = kind === 'benzene' ? Bond.PATTERN.TYPE.AROMATIC
        : kind === 'cyclopentadiene' && id === 3 ? Bond.PATTERN.TYPE.DOUBLE
          : Bond.PATTERN.TYPE.SINGLE;
      ring.bonds.set(id, new Bond({ ...edge, type }));
    });
  }

  // Prefer the less crowded side. Preflight both placements so nearby atoms
  // cannot silently merge with the carbon skeleton or receive its attributes.
  const candidates = [false, true].map((flip) => {
    const templateBond = ring.bonds.get(0)!;
    const templateBegin = ring.atoms.get(flip ? templateBond.end : templateBond.begin)!;
    const mergeParams = utils.mergeBondsParams(struct, bond, ring, {
      begin: flip ? templateBond.end : templateBond.begin,
      end: flip ? templateBond.begin : templateBond.end,
    });
    if (!mergeParams) throw new Error("无法确定稠合环的放置位置");
    const { angle, scale } = mergeParams;
    let score = 0;
    let overlaps = false;
    ring.atoms.forEach((atom, id) => {
      if (id === templateBond.begin || id === templateBond.end) return;
      const point = Vec2.diff(atom.pp, templateBegin.pp).rotate(angle).scaled(scale).add(begin.pp);
      struct.atoms.forEach((existing, existingId) => {
        if (existingId === bond.begin || existingId === bond.end) return;
        const distance = Vec2.dist(point, existing.pp);
        if (distance < 0.1) overlaps = true;
        score += 1 / Math.max(distance * distance, 0.01);
      });
    });
    return { flip, score, overlaps };
  }).filter((candidate) => !candidate.overlaps).sort((a, b) => a.score - b.score);
  if (!candidates.length) throw new Error('键两侧的稠合位置均与原子重叠，请先调整布局');

  return fromTemplateOnBondAction(restruct, {
    molecule: ring,
    bid: 0,
    aid: 0,
    angle0: 0,
    preserveTargetAtomAttributes: true,
    preserveExistingBondAttributes: true,
    mergeNearbyAtoms: false,
  }, bondId, null, candidates[0].flip, false);
}
