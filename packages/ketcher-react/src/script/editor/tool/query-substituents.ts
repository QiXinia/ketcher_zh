import { fromAtomsAttrs } from 'ketcher-core';
import type Editor from '../Editor';
import type { Tool } from './Tool';
import type { SubstitutionQueryMode } from 'ketcher-core';

type Options = { mode?: SubstitutionQueryMode | null; count?: number };

/** Apply one of ChemDraw's 16 Substituents query choices to an atom. */
class QuerySubstituentsTool implements Tool {
  private readonly editor: Editor;
  private readonly options: Options;

  constructor(editor: Editor, options: Options = {}) {
    this.editor = editor;
    this.options = options;
    editor.selection(null);
  }

  mousemove(event: Event) {
    this.editor.hover(
      this.editor.findItem(event as PointerEvent, ['atoms']),
      null,
      event as PointerEvent,
    );
  }

  click(event: Event) {
    const item = this.editor.findItem(event as PointerEvent, ['atoms']);
    if (!item || item.map !== 'atoms') return true;
    const atom = this.editor.render.ctab.molecule.atoms.get(item.id);
    if (!atom) return true;
    this.editor.hover(null);
    const mode = this.options.mode ?? null;
    const count = Math.max(0, Math.min(4, Number(this.options.count ?? 0))) as
      | 0
      | 1
      | 2
      | 3
      | 4;
    this.editor.update(
      fromAtomsAttrs(
        this.editor.render.ctab,
        item.id,
        {
          substitutionCount: 0,
          queryProperties: {
            ...atom.queryProperties,
            substitutionQuery: mode ? { mode, count } : null,
          },
        },
        false,
      ),
    );
    return true;
  }
}

export default QuerySubstituentsTool;
