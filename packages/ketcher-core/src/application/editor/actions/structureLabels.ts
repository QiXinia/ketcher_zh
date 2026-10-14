import type { ReStruct } from 'application/render';
import type { Struct } from 'domain/entities/struct';
import { SGroup } from 'domain/entities/sgroup';
import { SGroupAttachmentPoint } from 'domain/entities/sGroupAttachmentPoint';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import { captureNicknameFragment } from 'domain/helpers/nicknames';
import { Action } from './action';
import { fromSgroupAddition, fromSgroupAttrs } from './sgroup';

export type StructureLabelSelection = Partial<Record<'atoms' | 'bonds' | 'sgroups' | 'functionalGroups' | 'frags', number[]>>;
export interface StructureLabelDraft {
  atomIds: number[];
  sourceKet: string;
  previewKet: string;
  label: string;
}

/** Resolve chemical selection maps, rejecting stale references before edits. */
export function getStructureLabelAtoms(struct: Struct, selection: StructureLabelSelection | null): number[] {
  const atoms = new Set<number>();
  const add = (id: number) => {
    if (!Number.isInteger(id) || !struct.atoms.has(id)) throw new Error('结构选区已失效，请重新选择');
    atoms.add(id);
  };
  (selection?.atoms ?? []).forEach(add);
  (selection?.bonds ?? []).forEach(id => {
    const bond = struct.bonds.get(id);
    if (!Number.isInteger(id) || !bond) throw new Error('化学键选区已失效，请重新选择');
    add(bond.begin); add(bond.end);
  });
  (selection?.sgroups ?? []).forEach(id => {
    const group = struct.sgroups.get(id);
    if (!Number.isInteger(id) || !group) throw new Error('基团选区已失效，请重新选择');
    SGroup.getAtoms(struct, group).forEach(add);
  });
  (selection?.functionalGroups ?? []).forEach(id => {
    const group = struct.functionalGroups.get(id)?.relatedSGroup;
    if (!Number.isInteger(id) || !group) throw new Error('功能基选区已失效，请重新选择');
    SGroup.getAtoms(struct, group).forEach(add);
  });
  (selection?.frags ?? []).forEach(id => {
    if (!Number.isInteger(id) || !struct.frags.has(id)) throw new Error('片段选区已失效，请重新选择');
    struct.atoms.forEach((atom, aid) => { if (atom.fragment === id) add(aid); });
  });
  return [...atoms].sort((a, b) => a - b);
}

function getBoundaryAtoms(struct: Struct, atomIds: number[]) {
  const selected = new Set(atomIds);
  const boundary = new Set<number>();
  struct.bonds.forEach(bond => {
    if (selected.has(bond.begin) !== selected.has(bond.end)) {
      boundary.add(selected.has(bond.begin) ? bond.begin : bond.end);
    }
  });
  return boundary;
}

function validateLabelNesting(struct: Struct, atomIds: number[], existingId?: number) {
  const selected = new Set(atomIds);
  // The native renderer resolves the first S-group on each atom. Nesting a
  // contracted SUP would expose inner anchors or draw the wrong label.
  if ([...struct.sgroups.values()].some(group => group.id !== existingId && group.atoms.some(id => selected.has(id)))) {
    throw new Error('当前收起标签不支持嵌套或重叠 S-group，请先解除其他基团');
  }
}

function validateContractLabel(struct: Struct, atomIds: number[]) {
  // Shared capture checks connectedness, complete existing S-groups and R
  // logic. It clones for the preview; the actual document keeps every ID.
  const preview = captureNicknameFragment(struct, atomIds);
  const selected = new Set(atomIds);
  const boundary = getBoundaryAtoms(struct, atomIds);
  if (boundary.size > 1) throw new Error('当前收起标签不支持多个外接原子，请使用展开的多连接点基团');
  const exactGroups = [...struct.sgroups.values()].filter(group =>
    group.type === 'SUP' && group.atoms.length === selected.size && group.atoms.every(id => selected.has(id)));
  if (exactGroups.length > 1) throw new Error('选区中存在重叠标签，请先整理基团');
  if ([...struct.sgroups.values()].some(group => group.isMonomer && group.atoms.some(id => selected.has(id)))) {
    throw new Error('生物聚合物单体请使用原生大分子展开/收起操作');
  }
  validateLabelNesting(struct, atomIds, exactGroups[0]?.id);
  return { preview, existing: exactGroups[0], attachmentAtomId: [...boundary][0] ?? atomIds[0] };
}

export function captureStructureLabel(struct: Struct, selection: StructureLabelSelection | null): StructureLabelDraft {
  const atomIds = getStructureLabelAtoms(struct, selection);
  const { preview, existing } = validateContractLabel(struct, atomIds);
  return {
    atomIds, sourceKet: new KetSerializer().serializeMicromolecules(struct),
    previewKet: preview.ket, label: existing?.data.name ?? '',
  };
}

export function fromContractStructureLabel(restruct: ReStruct, value: string, draft: StructureLabelDraft) {
  const struct = restruct.molecule;
  if (!draft || !Array.isArray(draft.atomIds) ||
      draft.sourceKet !== new KetSerializer().serializeMicromolecules(struct)) {
    throw new Error('化学文档已变化，请关闭窗口并重新选择收起片段');
  }
  const label = typeof value === 'string' ? value.trim() : '';
  if (!label || label.length > 80 || /[\u0000-\u001f\u007f]/u.test(label)) throw new Error('标签需为 1–80 个字符，不能包含控制字符');
  const atomIds = getStructureLabelAtoms(struct, { atoms: draft.atomIds });
  const { existing, attachmentAtomId } = validateContractLabel(struct, atomIds);
  if (existing) {
    const changed = existing.data.name !== label || existing.isExpanded();
    return {
      inverseAction: changed ? fromSgroupAttrs(restruct, existing.id, { name: label, expanded: false }) : new Action(),
      groupId: existing.id, changed,
    };
  }
  const groupId = struct.sgroups.newId();
  return {
    inverseAction: fromSgroupAddition(restruct, 'SUP', atomIds, { name: label, expanded: false }, groupId,
      [new SGroupAttachmentPoint(attachmentAtomId, undefined, undefined)], struct.atoms.get(attachmentAtomId)!.pp, false, label),
    groupId, changed: true,
  };
}

/** Change only SUP display state. Atom/bond coordinates, attributes, colors
 * and the library remain untouched; one native Action covers all groups. */
export function fromSelectedStructureLabelState(restruct: ReStruct, selection: StructureLabelSelection | null, expanded: boolean) {
  if (typeof expanded !== 'boolean') throw new Error('标签显示状态必须是布尔值');
  const struct = restruct.molecule;
  const atomIds = new Set(getStructureLabelAtoms(struct, selection));
  const groups = [...struct.sgroups.values()].filter(group =>
    group.type === 'SUP' && group.atoms.length && group.atoms.every(id => atomIds.has(id)));
  if (!groups.length) throw new Error('请选择完整的昵称或收起标签');
  // Validate every target before changing any group (no partial batch edits).
  for (const group of groups) {
    if (group.isMonomer) throw new Error('生物聚合物单体请使用原生大分子展开/收起操作');
    if (!expanded) {
      if (!group.data.name?.trim() || getBoundaryAtoms(struct, group.atoms).size > 1) {
        throw new Error('没有名称或包含多个外接原子的基团不能收起为标签');
      }
      validateLabelNesting(struct, group.atoms, group.id);
    }
  }
  const inverseAction = new Action();
  let changedCount = 0;
  groups.forEach(group => {
    if (group.isExpanded() === expanded) return;
    inverseAction.mergeWith(fromSgroupAttrs(restruct, group.id, { expanded }));
    changedCount++;
  });
  return { inverseAction, groupIds: groups.map(group => group.id), changedCount };
}
