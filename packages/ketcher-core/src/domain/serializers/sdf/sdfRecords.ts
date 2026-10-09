export interface SdfRecord {
  molfile: string;
  props: Record<string, string>;
}

export interface SdfParseOptions {
  /** Legacy bundled template libraries may repeat metadata fields. */
  allowDuplicateFields?: boolean;
}

/** Preserve textual SD data; numbers, leading zeroes and newlines are data. */
export function parseSdfRecords(
  content: string,
  options: SdfParseOptions = {},
): SdfRecord[] {
  const chunks = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split(/^\$\$\$\$[ \t]*(?:\n|$)/m);
  return chunks
    .filter((chunk) => chunk.trim())
    .map((chunk, index) => {
      // A few bundled Ketcher libraries contain an extra blank line after the
      // record separator. Their title is followed by the normal Ketcher header;
      // remove only this unambiguous compatibility blank and preserve genuine
      // blank titles in user supplied SDF files.
      if (/^\n[^\n]*\nKetcher[ \t]/.test(chunk)) chunk = chunk.slice(1);
      const end = /^M {2}END[ \t]*$/m.exec(chunk);
      if (!end) throw new Error(`SDF record ${index + 1}: missing M  END`);
      const molfile = chunk.slice(0, end.index + end[0].length) + '\n';
      const lines = chunk.slice(end.index + end[0].length).split('\n');
      const props: Record<string, string> = Object.create(null);
      for (let i = 0; i < lines.length; i++) {
        const header = /^>\s*(?:\d+\s*)?<([^<>]+)>[^\n]*$/.exec(lines[i]);
        if (!header) {
          if (lines[i].trim())
            throw new Error(`SDF record ${index + 1}: invalid data header`);
          continue;
        }
        const field = header[1];
        if (Object.prototype.hasOwnProperty.call(props, field)) {
          if (!options.allowDuplicateFields) {
            throw new Error(
              `SDF record ${index + 1}: duplicate field ${field}`,
            );
          }
        }
        const value: string[] = [];
        while (++i < lines.length && lines[i] !== '') value.push(lines[i]);
        props[field] = value.join('\n');
      }
      return { molfile, props };
    });
}

export function serializeSdfRecord(record: SdfRecord): string {
  let result = record.molfile.replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
  for (const [field, value] of Object.entries(record.props)) {
    if (!field || /[<>\r\n]/.test(field))
      throw new Error('Invalid SDF field name');
    const text = String(value).replace(/\r\n?/g, '\n');
    if (/\n\n|^\$\$\$\$[ \t]*$/m.test(text) || /\n$/.test(text))
      throw new Error(`Invalid SDF field value: ${field}`);
    result += `> <${field}>\n${text}\n\n`;
  }
  return result + '$$$$\n';
}
