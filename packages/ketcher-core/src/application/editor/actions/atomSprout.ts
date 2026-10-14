import type { ReStruct } from 'application/render';
import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import type { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { Action } from './action';
import { atomForNewBond } from './utils';
import { fromBondStereoUpdate } from './bondStereo';
import { AtomAdd, AtomAttr, BondAdd, CalcImplicitH } from '../operations';

export type AtomSproutKind =
  | 'methyl-linear' | 'methyl-cyclic' | 'carbonyl' | 'phenyl'
  | 'wedge-up' | 'wedge-down' | 'cyclohexane' | 'cyclopentane'
  | 'methylidene' | 'dimethyl' | 'alkyne' | 'cyclopropane'
  | 'cyclobutane' | 'tert-butyl' | 'sulfonyl';

interface SproutPlan {
  atoms: Array<{ label: string; position: Vec2 }>;
  bonds: Array<{ begin: number; end: number; type: number; stereo: number }>;
  sourceLabel?: string;
  target: number;
}

const kinds: readonly AtomSproutKind[] = [
  'methyl-linear', 'methyl-cyclic', 'carbonyl', 'phenyl', 'wedge-up',
  'wedge-down', 'cyclohexane', 'cyclopentane', 'methylidene', 'dimethyl',
  'alkyne', 'cyclopropane', 'cyclobutane', 'tert-butyl', 'sulfonyl',
];

/** Recognize the common five/six-membered Kekule contexts without changing
 * document bond orders. Every ring atom must supply a p orbital; counting
 * doubles alone would incorrectly include cyclopentadiene and cyclic allenes.
 * This is a local growth rule, not a general aromaticity perception engine. */
function isAromaticHotspot(struct: Struct, sourceId: number): boolean {
  if (struct.atomGetNeighbors(sourceId).some(({ bid }) =>
    struct.bonds.get(bid)!.type === Bond.PATTERN.TYPE.AROMATIC)) return true;
  return struct.loops.some(loop => {
    if (![5, 6].includes(loop.hbs.length)) return false;
    const bonds = loop.hbs.map(id => struct.bonds.get(struct.halfBonds.get(id)!.bid)!);
    const ids = [...new Set(bonds.flatMap(bond => [bond.begin, bond.end]))];
    if (!ids.includes(sourceId) || ids.length !== bonds.length
      || bonds.some(bond => ![1, 2].includes(bond.type))) return false;
    let electrons = 0;
    for (const id of ids) {
      const atom = struct.atoms.get(id)!;
      if (atom.atomList || atom.customQuery || atom.radical) return false;
      const ringBonds = bonds.filter(bond => bond.begin === id || bond.end === id);
      const doubleCount = ringBonds.filter(bond => bond.type === 2).length;
      const externalBonds = struct.atomGetNeighbors(id).map(({ bid }) => struct.bonds.get(bid)!)
        .filter(bond => !bonds.includes(bond));
      if (ringBonds.length !== 2 || externalBonds.some(bond => bond.type !== 1)) return false;
      if (doubleCount === 1 && ['C', 'N', 'O', 'S'].includes(atom.label)) electrons += 1;
      else if (doubleCount === 0 && (atom.charge ?? 0) <= 0
        && ((atom.label === 'N' && externalBonds.length <= 1)
          || (['O', 'S'].includes(atom.label) && externalBonds.length === 0)
          || (atom.label === 'C' && atom.charge === -1 && externalBonds.length <= 1))) electrons += 2;
      else return false;
    }
    return electrons === 6;
  });
}

/** Build the complete local graph before touching the document. Atom zero is
 * the existing hotspot. ChemDraw User Guide, Atom Hotkeys, specifies different
 * primary/secondary/tertiary/aromatic results; these are not text aliases. */
function planSprout(source: Atom, degree: number, order: number, aromatic: boolean, kind: AtomSproutKind): SproutPlan {
  const plan: SproutPlan = { atoms: [{ label: source.label, position: new Vec2() }], bonds: [], target: 0 };
  const carbon = source.label === 'C';
  const ordinary = carbon && !aromatic;
  const point = (parent: number, angle: number, length = 1) =>
    plan.atoms[parent].position.add(new Vec2(Math.cos(angle), Math.sin(angle)).scaled(length));
  const add = (parent: number, label: string, angle: number, type = 1, stereo = 0, length = 1) => {
    const id = plan.atoms.push({ label, position: point(parent, angle, length) }) - 1;
    plan.bonds.push({ begin: parent, end: id, type, stereo });
    return id;
  };
  const branchAngles = [-Math.PI / 3, Math.PI / 3];
  const spacer = () => add(0, 'C', 0);

  if (kind === 'methyl-linear' || kind === 'methyl-cyclic') {
    plan.target = add(0, 'C', 0, 1, 0, kind === 'methyl-cyclic' && degree >= 2 ? 1.5 : 1);
  } else if (kind === 'carbonyl') {
    const center = ordinary && degree <= 2 && order <= 2 ? 0 : spacer();
    add(center, 'O', center === 0 && degree === 2 ? 0 : branchAngles[0], 2);
    if (center !== 0 || degree <= 1) add(center, 'C', branchAngles[1]);
    plan.target = center;
  } else if (kind === 'methylidene') {
    const center = ordinary && degree <= 2 && order <= 2 ? 0 : spacer();
    plan.target = add(center, 'C', center === 0 ? 0 : Math.PI / 3, 2);
  } else if (kind === 'alkyne') {
    const center = ordinary && degree <= 1 && order <= 1 ? 0 : spacer();
    plan.target = add(center, 'C', 0, 3);
  } else if (kind === 'wedge-up' || kind === 'wedge-down') {
    const center = aromatic ? spacer() : 0;
    add(center, 'C', degree <= 1 || aromatic ? branchAngles[0] : 0, 1,
      kind === 'wedge-up' ? Bond.PATTERN.STEREO.UP : Bond.PATTERN.STEREO.DOWN);
    if (degree <= 1 || aromatic) add(center, 'C', branchAngles[1]);
    plan.target = center;
  } else if (kind === 'dimethyl') {
    const center = ordinary && degree <= 2 && order <= 2 ? 0 : spacer();
    branchAngles.forEach(angle => add(center, 'C', angle));
    plan.target = center;
  } else if (kind === 'tert-butyl') {
    const center = ordinary && degree <= 1 && order <= 1 ? 0 : spacer();
    [-Math.PI / 2, 0, Math.PI / 2].forEach(angle => add(center, 'C', angle));
    plan.target = center;
  } else if (kind === 'sulfonyl') {
    // Converting a plain carbon hotspot is the documented sulfonyl behavior.
    // Keep labeled/isotopic carbons intact by attaching a new sulfur instead.
    const replace = ordinary && degree <= 2 && order <= 2 && !source.isotope;
    const center = replace || source.label === 'S' && degree <= 2 ? 0 : add(0, 'S', 0);
    if (replace) plan.sourceLabel = 'S';
    add(center, 'O', -Math.PI / 3, 2);
    add(center, 'O', Math.PI / 3, 2);
    if (center !== 0 || degree <= 1) add(center, 'C', 0);
    plan.target = center;
  } else {
    const size = kind === 'cyclopropane' ? 3 : kind === 'cyclobutane' ? 4 : kind === 'cyclopentane' ? 5 : 6;
    const share = ordinary && order <= 2 && degree <= (kind === 'phenyl' ? 1 : 2);
    const anchor = share ? 0 : add(0, 'C', 0);
    const radius = 1 / (2 * Math.sin(Math.PI / size));
    const center = plan.atoms[anchor].position.add(new Vec2(radius, 0));
    const ids = [anchor];
    for (let i = 1; i < size; i++) {
      const angle = Math.PI + 2 * Math.PI * i / size;
      ids.push(plan.atoms.push({ label: 'C', position: center.add(new Vec2(Math.cos(angle), Math.sin(angle)).scaled(radius)) }) - 1);
    }
    for (let i = 0; i < size; i++) {
      plan.bonds.push({ begin: ids[i], end: ids[(i + 1) % size], type: kind === 'phenyl' && i % 2 === 0 ? 2 : 1, stereo: 0 });
    }
    plan.target = anchor;
  }
  return plan;
}

/** Mutates with native operations and returns one inverse Action for history. */
export function fromSelectedAtomSprout(restruct: ReStruct, atomIds: readonly number[], kind: AtomSproutKind) {
  if (!kinds.includes(kind)) throw new Error('不支持的原子生长类型');
  const { sourceId, struct, source } = validateAtomSproutTarget(restruct, atomIds);
  return sproutFromAtom(restruct, sourceId, struct, source, kind);
}

/** Shared preflight for fixed fragments and user-entered labels. */
export function validateAtomSproutTarget(restruct: ReStruct, atomIds: readonly number[]) {
  if (atomIds.length !== 1 || !Number.isInteger(atomIds[0])) throw new Error('请只选择一个原子来生长片段');
  const sourceId = atomIds[0];
  const struct = restruct.molecule;
  const source = struct.atoms.get(sourceId);
  if (!source) throw new Error('所选原子已失效');
  if (source.sgs.size) throw new Error('请先解除所选原子所在的 S-group，再生长片段');
  if (source.atomList || source.rglabel || source.label === 'R#' || source.customQuery) {
    throw new Error('查询原子和 R-group 连接原子不能直接生长片段');
  }
  return { sourceId, struct, source };
}

function sproutFromAtom(restruct: ReStruct, sourceId: number, struct: Struct, source: Atom, kind: AtomSproutKind) {
  const neighbors = struct.atomGetNeighbors(sourceId);
  const bonds = neighbors.map(neighbor => struct.bonds.get(neighbor.bid)!);
  const order = bonds.reduce((sum, bond) => sum + (bond.type === Bond.PATTERN.TYPE.AROMATIC ? 1.5 : bond.type), 0);
  const aromatic = isAromaticHotspot(struct, sourceId);
  const degree = neighbors.length;
  const plan = planSprout(source, degree, order, aromatic, kind);

  const native = atomForNewBond(restruct, sourceId, { type: kind === 'alkyne' ? 3 : 1 });
  let direction = Vec2.diff(native.pos, source.pp);
  const branched = ['carbonyl', 'wedge-up', 'wedge-down', 'dimethyl', 'tert-butyl', 'sulfonyl'].includes(kind);
  if (degree === 1 && branched) direction = Vec2.diff(source.pp, struct.atoms.get(neighbors[0].aid)!.pp);
  if (kind === 'methyl-cyclic' && degree === 1) direction = Vec2.diff(source.pp, struct.atoms.get(neighbors[0].aid)!.pp).rotate(-Math.PI / 3);
  if ((kind === 'wedge-up' || kind === 'wedge-down') && degree === 3 && !aromatic) direction = new Vec2(0, -1);
  const angle = Math.atan2(direction.y, direction.x);
  const scale = bonds.length ? Math.min(2, Math.max(0.2, bonds.reduce((sum, bond) =>
    sum + Vec2.dist(struct.atoms.get(bond.begin)!.pp, struct.atoms.get(bond.end)!.pp), 0) / bonds.length)) : 1;
  const localToWorld = (position: Vec2, rotation: number) => position.scaled(scale).rotate(rotation).add(source.pp);

  // Cyclic methyl growth may close a ring at an existing unconnected atom.
  // All other appendages preflight collisions and never merge or overwrite it.
  let closeAtom: number | undefined;
  if (kind === 'methyl-cyclic') {
    const destination = localToWorld(plan.atoms[1].position, angle);
    struct.atoms.forEach((atom, id) => {
      if (id !== sourceId && atom.fragment === source.fragment && !atom.sgs.size
        && struct.findBondId(sourceId, id) === null && Vec2.dist(atom.pp, destination) < 0.1 * scale) closeAtom = id;
    });
  }
  const offsets = kind === 'methyl-cyclic' ? [0]
    : (kind === 'wedge-up' || kind === 'wedge-down') && degree === 3 && !aromatic ? [0, Math.PI]
      : [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI];
  const candidates = offsets.map(offset => {
    const positions = plan.atoms.map(atom => localToWorld(atom.position, angle + offset));
    let score = Math.abs(offset) * 0.05;
    let overlap = false;
    positions.slice(1).forEach(point => struct.atoms.forEach((atom, id) => {
      if (id === sourceId || id === closeAtom) return;
      const distance = Vec2.dist(point, atom.pp) / scale;
      if (distance < 0.1) overlap = true;
      score += 1 / Math.max(distance * distance, 0.01);
    }));
    return { positions, score, overlap, rotation: Math.abs(offset) };
  }).filter(candidate => !candidate.overlap).sort((a, b) => a.rotation - b.rotation || a.score - b.score);
  if (!candidates.length) throw new Error('片段生长位置与既有原子重叠，请先调整布局');

  const inverse = new Action();
  const atomMap = new Map([[0, sourceId]]);
  const addedAtoms: number[] = [];
  const addedBonds: number[] = [];
  if (plan.sourceLabel) inverse.addOp(new AtomAttr(sourceId, 'label', plan.sourceLabel).perform(restruct));
  for (let index = 1; index < plan.atoms.length; index++) {
    if (closeAtom !== undefined) { atomMap.set(index, closeAtom); continue; }
    const operation = new AtomAdd({ label: plan.atoms[index].label, fragment: source.fragment }, candidates[0].positions[index]);
    inverse.addOp(operation.perform(restruct));
    atomMap.set(index, operation.data.aid!);
    addedAtoms.push(operation.data.aid!);
  }
  plan.bonds.forEach(bond => {
    const operation = new BondAdd(atomMap.get(bond.begin)!, atomMap.get(bond.end)!, { type: bond.type, stereo: bond.stereo });
    inverse.addOp(operation.perform(restruct));
    addedBonds.push(operation.data.bid!);
  });
  inverse.addOp(new CalcImplicitH([...atomMap.values()]).perform(restruct));
  inverse.mergeWith(fromBondStereoUpdate(restruct, struct.bonds.get(addedBonds[0])!));
  inverse.operations.reverse();
  return { inverseAction: inverse, atoms: addedAtoms, bonds: addedBonds, targetAtomId: atomMap.get(plan.target)! };
}
