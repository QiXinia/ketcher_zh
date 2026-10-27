import { Elements } from '../constants/elements';

export function normalizeAtomSproutLabel(value: string): string {
  if (typeof value !== 'string') throw new Error('请输入原子标签');
  const label = value.trim();
  if (!label || label.length > 40 || /[\s\u0000-\u001f\u007f]/u.test(label)) {
    throw new Error('标签需为 1–40 个字符，不能包含空白或控制字符');
  }
  return label;
}

/** Match Ketcher's quick-edit element/isotope/charge/radical notation.
 * Unrecognized text remains an explicit pseudoatom, never an inferred carbon
 * or a fabricated expansion of an unknown abbreviation. */
export function parseAtomSproutLabel(value: string) {
  const text = normalizeAtomSproutLabel(value);
  const match = /^(\d+)?([a-z*]{1,3})(\.|:|\^\^)?(\d+[-+]|[-+])?$/i.exec(text);
  if (match) {
    const label = match[2] === '*' ? 'A' : match[2][0].toUpperCase() + match[2].slice(1).toLowerCase();
    if (Elements.get(label) || ['A', 'Q', 'X', 'M'].includes(label)) {
      const isotope = match[1] ? Number(match[1]) : null;
      const magnitude = match[4] ? Number.parseInt(match[4], 10) || 1 : 0;
      if ((isotope !== null && !Number.isSafeInteger(isotope)) || !Number.isSafeInteger(magnitude)) {
        throw new Error('同位素或电荷数值过大');
      }
      return {
        label, isotope, charge: magnitude ? magnitude * (match[4].endsWith('-') ? -1 : 1) : null,
        radical: match[3] ? { ':': 1, '.': 2, '^^': 3 }[match[3]] ?? 0 : 0,
        pseudo: false,
      };
    }
  }
  return { label: text, isotope: null, charge: null, radical: 0, pseudo: true };
}
