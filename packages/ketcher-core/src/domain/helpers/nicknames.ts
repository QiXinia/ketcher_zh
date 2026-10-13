import { Struct } from '../entities/struct';
import { Pile } from '../entities/pile';
import { SGroup } from '../entities/sgroup';
import { SGroupAttachmentPoint } from '../entities/sGroupAttachmentPoint';
import { FunctionalGroup } from '../entities/functionalGroup';
import { KetSerializer } from '../serializers/ket/ketSerializer';

/** A nickname is a chemical fragment, never a replacement atom alias. */
export interface NicknameDraft {
  ket: string;
  atoms: Array<{ id: number; originalId: number; label: string }>;
  bondCount: number;
  attachmentAtomId: number;
}

export interface NicknameDefinition {
  name: string;
  ket: string;
  attachmentAtomId: number;
  atomCount: number;
  bondCount: number;
}

export function normalizeNicknameName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 40 || /[\s\u0000-\u001f\u007f]/u.test(name)) {
    throw new Error('昵称需为 1–40 个字符，不能包含空白或控制字符');
  }
  return name;
}

function checkFragment(struct: Struct): void {
  if (!struct.atoms.size) throw new Error('请先选择要定义昵称的原子');
  if (struct.atoms.size > 500) throw new Error('昵称片段最多包含 500 个原子');
  if (struct.findConnectedComponents(true).length !== 1) {
    throw new Error('昵称需要一个相连的结构片段，请分别定义不相连的分子');
  }
  if (
    struct.rgroups.size ||
    [...struct.atoms.values()].some((atom) => atom.rglabel)
  ) {
    throw new Error('R-group 逻辑结构请使用原生模板库保存');
  }
}

/** Expand an isolated copy for depiction/calculation; never update the
 * library's contracted SUP or the editor's document/history. */
export function prepareNicknamePreview(ket: string): string {
  if (ket.length > 1024 * 1024) throw new Error('昵称片段数据过大');
  const serializer = new KetSerializer();
  const fragment = serializer.deserializeMicromolecules(ket);
  checkFragment(fragment);
  fragment.sgroups.forEach(group => {
    if (group.type === 'SUP') group.data.expanded = true;
  });
  return serializer.serializeMicromolecules(fragment);
}

export function captureNicknameFragment(
  source: Struct,
  selectedAtomIds: number[],
): NicknameDraft {
  const selected = new Pile(selectedAtomIds);
  if ([...selected].some((id) => !source.atoms.has(id)))
    throw new Error('原子选区已失效，请重新选择');
  for (const group of source.sgroups.values()) {
    if (
      group.atoms.some((id) => selected.has(id)) &&
      group.atoms.some((id) => !selected.has(id))
    ) {
      throw new Error('请选择完整的 S-group，避免昵称丢失基团属性');
    }
  }
  const atomMap = new Map<number, number>();
  // Include all internal bonds; exclude unrelated text, images and drawings.
  const fragment = source.clone(
    selected,
    null,
    true,
    atomMap,
    new Pile(),
    new Pile(),
    new Pile(),
    new Pile(),
    new Pile(),
  );
  checkFragment(fragment);
  const boundaryAtoms = new Set<number>();
  source.bonds.forEach((bond) => {
    if (selected.has(bond.begin) !== selected.has(bond.end)) {
      boundaryAtoms.add(selected.has(bond.begin) ? bond.begin : bond.end);
    }
  });
  const atoms = [...atomMap].map(([originalId, id]) => ({
    id,
    originalId,
    label: fragment.atoms.get(id)!.label,
  }));
  const boundaryId =
    boundaryAtoms.size === 1 ? [...boundaryAtoms][0] : undefined;
  return {
    ket: new KetSerializer().serializeMicromolecules(fragment),
    atoms,
    bondCount: fragment.bonds.size,
    attachmentAtomId:
      boundaryId === undefined ? atoms[0].id : atomMap.get(boundaryId)!,
  };
}

export function createNicknameDefinition(
  ket: string,
  value: string,
  attachmentAtomId: number,
): NicknameDefinition {
  const name = normalizeNicknameName(value);
  if (ket.length > 1024 * 1024) throw new Error('昵称片段数据过大');
  const serializer = new KetSerializer();
  const fragment = serializer.deserializeMicromolecules(ket);
  checkFragment(fragment);
  if (
    !Number.isInteger(attachmentAtomId) ||
    !fragment.atoms.has(attachmentAtomId)
  )
    throw new Error('连接原子不在昵称片段中');
  // Rename a whole-fragment SUP without nesting another contracted label.
  let group = [...fragment.sgroups.values()].find(
    (sgroup) =>
      sgroup.type === 'SUP' && sgroup.atoms.length === fragment.atoms.size,
  );
  if (!group) {
    group = new SGroup('SUP');
    group.atoms = [...fragment.atoms.keys()];
    group.id = fragment.sgroups.add(group);
    group.atoms.forEach((id) => fragment.atoms.get(id)!.sgs.add(group!.id));
    fragment.sGroupForest.insert(group);
    fragment.functionalGroups.add(new FunctionalGroup(group));
  } else {
    [...group.getAttachmentPoints()].forEach((point) =>
      group!.removeAttachmentPoint(point),
    );
  }
  group.data.name = name;
  group.data.expanded = false;
  group.addAttachmentPoint(
    new SGroupAttachmentPoint(attachmentAtomId, undefined, undefined),
  );
  fragment.name = name;
  return {
    name,
    ket: serializer.serializeMicromolecules(fragment),
    attachmentAtomId,
    atomCount: fragment.atoms.size,
    bondCount: fragment.bonds.size,
  };
}
