import type { Editor, Selection } from '../Editor';
import { SGroup } from 'ketcher-core';

/** Resolve chemical targets before opening a DAT form. A data label can select
 * its own S-group; atom/bond selections must identify exactly one data group
 * when editing, so overlapping annotations are never silently overwritten. */
export function prepareDataAttachment(
  editor: Editor,
  edit: boolean,
): { id: number | null; selection: Selection } {
  const struct = editor.render.ctab.molecule;
  const selected = editor.selection() ?? {};
  const atoms = new Set<number>();
  const bonds: number[] = [];
  selected.atoms?.forEach((id) => {
    if (struct.atoms.has(id)) atoms.add(id);
  });
  selected.bonds?.forEach((id) => {
    const bond = struct.bonds.get(id);
    if (!bond) return;
    bonds.push(id);
    atoms.add(bond.begin);
    atoms.add(bond.end);
  });
  selected.frags?.forEach((fragmentId) => {
    struct.atoms.forEach((atom, id) => {
      if (atom.fragment === fragmentId) atoms.add(id);
    });
  });
  const selectedGroups = new Set([
    ...(selected.sgroupData ?? []),
    ...(selected.sgroups ?? []),
  ]);
  const editableData = (group: SGroup | undefined) =>
    group?.type === SGroup.TYPES.DAT &&
    group.data.fieldName !== 'INDIGO_CIP_DESC';
  const directIds = [...selectedGroups].filter((id) =>
    editableData(struct.sgroups.get(id)),
  );
  const hasNonDataDirectSelection = [...selectedGroups].some((id) =>
    !editableData(struct.sgroups.get(id)),
  );
  selectedGroups.forEach((id) => {
    const group = struct.sgroups.get(id);
    if (!group || group.data.fieldName === 'INDIGO_CIP_DESC') return;
    group.atoms.forEach((atomId: number) => {
      if (struct.atoms.has(atomId)) atoms.add(atomId);
    });
  });

  if (!atoms.size) {
    if (edit && selectedGroups.size) {
      throw new Error('选区没有附加数据，请先附加数据或选择数据标注');
    }
    throw new Error('请先选择需要附加数据的原子、键或数据标注');
  }
  if (!edit) return { id: null, selection: { atoms: [...atoms], bonds } };
  if (hasNonDataDirectSelection && !directIds.length) {
    throw new Error('选区没有附加数据，请先附加数据或选择数据标注');
  }

  const ids = directIds.length ? directIds : [...struct.sgroups.entries()]
    .filter(([, group]) => editableData(group) &&
      group.atoms.length === atoms.size &&
      group.atoms.every((id: number) => atoms.has(id)))
    .map(([id]) => id);
  if (!ids.length) throw new Error('选区没有附加数据，请先附加数据或选择数据标注');
  if (ids.length !== 1) throw new Error('选区包含多个数据标注，请只选择一个数据标注后编辑');
  return { id: ids[0], selection: { atoms: [...struct.sgroups.get(ids[0])!.atoms], bonds } };
}
