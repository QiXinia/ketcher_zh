import {
  createNicknameDefinition,
  KetSerializer,
  normalizeNicknameName,
} from 'ketcher-core';
import type { NicknameDefinition } from 'ketcher-core';

const STORAGE_KEY = 'ketcher-nicknames:v1';
const EXCHANGE_FORMAT = 'chemwiki-nicknames/v1';
const MAX_EXCHANGE_BYTES = 10 * 1024 * 1024;

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
  return validateItems(data);
}

function validateItems(data: unknown): NicknameDefinition[] {
  const document = data as { version?: unknown; items?: unknown[] } | null;
  if (
    document?.version !== 1 ||
    !Array.isArray(document.items) ||
    document.items.length > 200
  )
    throw new Error('昵称库数据无效，请先备份并修复浏览器中的昵称库');
  const names = new Set<string>();
  return document.items
    .map((item) => {
      const record = item as Partial<NicknameDefinition> | null;
      if (typeof record?.name !== 'string' || typeof record?.ket !== 'string')
        throw new Error('昵称库条目无效');
      const entry = createNicknameDefinition(
        record.ket,
        record.name,
        record.attachmentAtomId!,
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

function checkExchangeSize(source: string): void {
  if (source.length > MAX_EXCHANGE_BYTES || new TextEncoder().encode(source).length > MAX_EXCHANGE_BYTES)
    throw new Error('昵称库文件不能超过 10 MiB');
}

export function exportNicknameLibrary(): string {
  const source = `${JSON.stringify({ format: EXCHANGE_FORMAT, version: 1, items: getNicknames() }, null, 2)}\n`;
  checkExchangeSize(source);
  return source;
}

/** Merge in one storage write after validating every entry. Name conflicts,
 * damaged fragments and quota errors never partially replace the library. */
export function importNicknameLibrary(source: string): number {
  checkExchangeSize(source);
  let data;
  try { data = JSON.parse(source.replace(/^\uFEFF/, '')); }
  catch { throw new Error('昵称库文件不是有效的 JSON'); }
  if (data?.format !== EXCHANGE_FORMAT) throw new Error('请选择 ChemWiki 导出的昵称库 JSON 文件');
  const incoming = validateItems(data);
  const existing = getNicknames();
  const names = new Set(existing.map(item => item.name.toLowerCase()));
  const conflict = incoming.find(item => names.has(item.name.toLowerCase()));
  if (conflict) throw new Error(`昵称 ${conflict.name} 已存在，导入未写入，请先重命名或删除重复昵称`);
  if (existing.length + incoming.length > 200) throw new Error('自定义昵称库最多保存 200 个片段');
  if (!incoming.length) return 0;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: [...existing, ...incoming] }));
  return incoming.length;
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
