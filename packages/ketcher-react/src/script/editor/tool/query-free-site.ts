import { fromAtomsAttrs } from 'ketcher-core';
import type Editor from '../Editor';
import type { Tool } from './Tool';

/**
 * ChemDraw's Free Site query marker is represented by the CTfile/Ketcher
 * substitution query `s*` (zero or more available substituents).  Keeping
 * this as a native atom attribute means it participates in undo/redo, SMARTS
 * rendering and KET serialization instead of being a screen-only glyph.
 */
class QueryFreeSiteTool implements Tool {
  private readonly editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    editor.selection(null);
  }

  mousemove(event: Event) {
    this.editor.hover(this.editor.findItem(event as PointerEvent, ['atoms']), null, event as PointerEvent);
  }

  click(event: Event) {
    const item = this.editor.findItem(event as PointerEvent, ['atoms']);
    if (!item || item.map !== 'atoms') return true;
    this.editor.hover(null);
    this.editor.update(
      fromAtomsAttrs(this.editor.render.ctab, item.id, { substitutionCount: -2 }, false),
    );
    return true;
  }
}

export default QueryFreeSiteTool;
