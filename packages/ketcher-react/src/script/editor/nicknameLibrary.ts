import {
  createNicknameDefinition,
  KetSerializer,
  normalizeNicknameName,
} from 'ketcher-core';
import type { NicknameDefinition } from 'ketcher-core';

const STORAGE_KEY = 'ketcher-nicknames:v1';

/** Validate before writing: never overwrite a corrupt library. Library edits
 * are preferences and do not enter the chemical document's undo history. */
export function getNicknames(): NicknameDefinition[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('昵称库数据无效，请先备份并修复浏览器中的昵称库');
  }
  if (
    data?.version !== 1 ||
    !Array.isArray(data.items) ||
    data.items.length > 200
  )
    throw new Error('昵称库数据无效，请先备份并修复浏览器中的昵称库');
  const names = new Set<string>();
  return data.items
    .map((item) => {
      if (typeof item?.name !== 'string' || typeof item?.ket !== 'string')
        throw new Error('昵称库条目无效');
      const entry = createNicknameDefinition(
        item.ket,
        item.name,
        item.attachmentAtomId,
      );
      if (names.has(entry.name.toLowerCase()))
        throw new Error('昵称库中存在重复名称');
      names.add(entry.name.toLowerCase());
      return entry;
    })
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    );
}

export function saveNickname(
  ket: string,
  name: string,
  attachmentAtomId: number,
): NicknameDefinition {
  const entry = createNicknameDefinition(ket, name, attachmentAtomId);
  const items = getNicknames();
  if (
    items.some((item) => item.name.toLowerCase() === entry.name.toLowerCase())
  )
    throw new Error('该昵称已存在，请使用其他名称或先删除旧条目');
  if (items.length >= 200) throw new Error('自定义昵称库最多保存 200 个片段');
  // Quota/disabled-storage errors propagate; only persisted KET is a save.
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, items: [...items, entry] }),
  );
  return entry;
}

export function deleteNickname(value: string): void {
  const name = normalizeNicknameName(value);
  const items = getNicknames();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      items: items.filter((item) => item.name !== name),
    }),
  );
}

export function getNicknameTemplate(name: string) {
  const entry = getNicknames().find((item) => item.name === name);
  if (!entry) throw new Error('昵称已不存在，请刷新昵称列表');
  return {
    struct: new KetSerializer().deserializeMicromolecules(entry.ket),
    aid: entry.attachmentAtomId,
    props: { group: 'Functional Groups' },
  };
}
