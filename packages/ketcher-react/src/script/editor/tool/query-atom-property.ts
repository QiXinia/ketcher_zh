import { fromAtomsAttrs } from 'ketcher-core';
import type Editor from '../Editor';
import type { Tool } from './Tool';

export type QueryAtomPropertyOptions = {
  /** Direct Atom attributes (for legacy Ketcher query fields). */
  attrs?: Record<string, unknown>;
  /** Nested Atom.queryProperties values. */
  queryProperties?: Record<string, unknown>;
};

/** Applies a ChemDraw atom-query menu choice to the atom under the pointer. */
class QueryAtomPropertyTool implements Tool {
  private readonly editor: Editor;
  private readonly options: QueryAtomPropertyOptions;

  constructor(editor: Editor, options: QueryAtomPropertyOptions = {}) {
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
    const queryProperties = this.options.queryProperties
      ? { ...atom.queryProperties, ...this.options.queryProperties }
      : undefined;
    this.editor.update(
      fromAtomsAttrs(
        this.editor.render.ctab,
        item.id,
        {
          ...(this.options.attrs ?? {}),
          ...(queryProperties ? { queryProperties } : {}),
        },
        false,
      ),
    );
    return true;
  }
}

export default QueryAtomPropertyTool;
