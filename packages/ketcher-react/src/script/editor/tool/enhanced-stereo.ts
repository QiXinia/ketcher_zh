/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import {
  findStereoAtoms,
  fromAtomsAttrs,
  fromStereoFlagUpdate,
} from 'ketcher-core';

import type Editor from '../Editor';
import type { Tool } from './Tool';

class EnhancedStereoTool implements Tool {
  private readonly editor: Editor;
  private readonly stereoAtoms: Array<number>;
  isNotActiveTool: true;

  constructor(editor, options?: { fixedStereo?: 'abs' | 'and' | 'or' }) {
    const selection = editor.selection();
    this.editor = editor;
    this.isNotActiveTool = true;

    this.stereoAtoms = findStereoAtoms(
      editor.struct(),
      selection
        ? selection.atoms || []
        : Array.from(editor.struct().atoms.keys()),
    );

    if (this.stereoAtoms.length === 0) {
      return;
    }

    const fixedStereo = options?.fixedStereo;
    const actionPromise = fixedStereo
      ? Promise.resolve(
          EnhancedStereoTool.fixedStereoAction(
            this.editor,
            this.stereoAtoms,
            fixedStereo,
          ),
        )
      : EnhancedStereoTool.changeAtomsStereoAction(
          this.editor,
          this.stereoAtoms,
        );
    actionPromise.then((action) => action && editor.update(action));
  }

  /** Apply a Query Tools stereo marker without opening the generic dialog. */
  static fixedStereoAction(
    editor: Editor,
    stereoAtoms: Array<number>,
    fixedStereo: 'abs' | 'and' | 'or',
  ) {
    const struct = editor.struct();
    const restruct = editor.render.ctab;
    const prefix = fixedStereo === 'abs' ? 'abs' : fixedStereo === 'and' ? '&' : 'or';
    const usedGroups = Array.from(struct.atoms.values())
      .map((atom) => atom.stereoLabel || '')
      .filter((label) => label.startsWith(prefix))
      .map((label) => Number(label.slice(prefix.length)))
      .filter((number) => Number.isInteger(number) && number > 0);
    const group = prefix === 'abs' ? '' : String(Math.max(0, ...usedGroups) + 1);
    const stereoLabel = `${prefix}${group}`;
    const action = stereoAtoms.reduce(
      (acc, stereoAtom) => {
        const frid = struct.atoms.get(stereoAtom)?.fragment;
        const frag = frid !== undefined ? restruct.molecule.frags.get(frid) : null;
        if (frag?.stereoAtoms) return acc.mergeWith(fromStereoFlagUpdate(restruct, frid));
        return acc;
      },
      fromAtomsAttrs(restruct, stereoAtoms, { stereoLabel }, false),
    );
    action.operations.reverse();
    return action;
  }

  static changeAtomsStereoAction(editor: Editor, stereoAtoms: Array<number>) {
    const struct = editor.struct();
    const restruct = editor.render.ctab;
    const stereoLabels = stereoAtoms.map((stereoAtom) => {
      const atom = struct.atoms.get(stereoAtom);
      return atom?.stereoLabel;
    });
    const hasAnotherLabel = stereoLabels.some(
      (stereoLabel) => stereoLabel !== stereoLabels[0],
    );
    const res = editor.event.enhancedStereoEdit.dispatch({
      stereoLabel: hasAnotherLabel ? null : stereoLabels[0],
    });

    return res.then((stereoLabel) => {
      if (!stereoLabel) {
        return null;
      }

      const action = stereoAtoms.reduce(
        (acc, stereoAtom) => {
          const frid = struct.atoms.get(stereoAtom)?.fragment;
          const frag =
            frid !== undefined ? restruct.molecule.frags.get(frid) : null;

          if (frag?.stereoAtoms) {
            return acc.mergeWith(fromStereoFlagUpdate(restruct, frid));
          }
          return acc;
        },
        fromAtomsAttrs(
          restruct,
          stereoAtoms,
          {
            stereoLabel,
          },
          false,
        ),
      );
      action.operations.reverse();
      return action;
    });
  }
}

export default EnhancedStereoTool;
