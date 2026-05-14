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
  RxnArrowMode,
  SimpleObjectMode,
  findStereoAtoms,
  IMAGE_KEY,
  MULTITAIL_ARROW_TOOL_NAME,
  CREATE_MONOMER_TOOL_NAME,
} from 'ketcher-core';

import { bond as bondSchema } from '../data/schema/struct-schema';
import isHidden from './isHidden';
import { toBondType } from '../data/convert/structconv';
import { isFlipDisabled } from './flips';
import { MONOMER_WIZARD_DISALLOWED_BOND_TYPES } from '../views/components/ContextMenu/utils';
import i18n from '../../../i18n';
import { getBondDisplayTitle } from '../../../i18n/helpers';

const toolActions = {
  hand: {
    title: i18n.t('tools.handTool'),
    enabledInViewOnly: true,
    shortcut: 'Mod+Alt+h',
    action: { tool: 'hand' },
    hidden: (options) => isHidden(options, 'hand'),
  },
  'select-rectangle': {
    title: i18n.t('tools.rectangleSelection'),
    enabledInViewOnly: true,
    shortcut: ['Shift+Tab', 'Escape'],
    action: { tool: 'select', opts: 'rectangle' },
    hidden: (options) => isHidden(options, 'select-rectangle'),
  },
  'select-lasso': {
    title: i18n.t('tools.lassoSelection'),
    enabledInViewOnly: true,
    shortcut: ['Shift+Tab', 'Escape'],
    action: { tool: 'select', opts: 'lasso' },
  },
  'select-structure': {
    title: i18n.t('tools.structureSelection'),
    shortcut: ['Shift+Tab', 'Escape'],
    action: { tool: 'select', opts: 'fragment' },
    hidden: (options) => isHidden(options, 'select-structure'),
  },
  'select-fragment': {
    title: i18n.t('tools.fragmentSelection'),
    shortcut: ['Shift+Tab', 'Escape'],
    action: { tool: 'fragmentSelection' },
    hidden: (options) => isHidden(options, 'select-fragment'),
  },
  erase: {
    title: i18n.t('tools.erase'),
    shortcut: ['Delete', 'Backspace'],
    action: { tool: 'eraser', opts: 1 }, // TODO last selector mode is better
    hidden: (options) => isHidden(options, 'erase'),
  },
  chain: {
    title: i18n.t('tools.chain'),
    action: { tool: 'chain' },
    hidden: (options) => isHidden(options, 'chain'),
  },
  'enhanced-stereo': {
    shortcut: 'Alt+e',
    title: i18n.t('tools.stereochemistry'),
    action: { tool: 'enhancedStereo' },
    disabled: (editor) =>
      editor.isMonomerCreationWizardActive ||
      findStereoAtoms(
        editor?.struct(),
        Array.from(editor?.struct().atoms.keys()),
      ).length === 0,
    hidden: (options) => isHidden(options, 'enhanced-stereo'),
  },
  'charge-plus': {
    shortcut: ['Equal', 'Shift+Equal', 'NumpadAdd'],
    title: i18n.t('tools.chargePlus'),
    action: { tool: 'charge', opts: 1 },
    hidden: (options) => isHidden(options, 'charge-plus'),
  },
  'charge-minus': {
    shortcut: ['Minus', 'NumpadSubtract'],
    title: i18n.t('tools.chargeMinus'),
    action: { tool: 'charge', opts: -1 },
    hidden: (options) => isHidden(options, 'charge-minus'),
  },
  'transform-rotate': {
    title: i18n.t('tools.rotateTool'),
    action: { tool: 'rotate' },
    hidden: (options) => isHidden(options, 'transform-rotate'),
  },
  'transform-flip-h': {
    shortcut: 'Alt+h',
    title: i18n.t('tools.horizontalFlip'),
    action: { tool: 'rotate', opts: 'horizontal' },
    disabled: isFlipDisabled,
    hidden: (options) => isHidden(options, 'transform-flip-h'),
  },
  'transform-flip-v': {
    shortcut: 'Alt+v',
    title: i18n.t('tools.verticalFlip'),
    action: { tool: 'rotate', opts: 'vertical' },
    disabled: isFlipDisabled,
    hidden: (options) => isHidden(options, 'transform-flip-v'),
  },
  sgroup: {
    shortcut: 'Mod+g',
    title: i18n.t('tools.sgroup'),
    action: { tool: 'sgroup' },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'sgroup'),
  },
  arrows: {
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'arrows'),
  },
  'reaction-arrow-open-angle': {
    title: i18n.t('tools.arrowOpenAngleTool'),
    action: { tool: 'reactionarrow', opts: RxnArrowMode.OpenAngle },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-arrow-open-angle'),
  },
  'reaction-arrow-filled-triangle': {
    title: i18n.t('tools.arrowFilledTriangleTool'),
    action: { tool: 'reactionarrow', opts: RxnArrowMode.FilledTriangle },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-arrow-filled-triangle'),
  },
  'reaction-arrow-filled-bow': {
    title: i18n.t('tools.arrowFilledBowTool'),
    action: { tool: 'reactionarrow', opts: RxnArrowMode.FilledBow },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-arrow-filled-bow'),
  },
  'reaction-arrow-dashed-open-angle': {
    title: i18n.t('tools.arrowDashedOpenAngleTool'),
    action: { tool: 'reactionarrow', opts: RxnArrowMode.DashedOpenAngle },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-arrow-dashed-open-angle'),
  },
  'reaction-arrow-failed': {
    title: i18n.t('tools.failedArrowTool'),
    action: { tool: 'reactionarrow', opts: RxnArrowMode.Failed },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-arrow-failed'),
  },
  'reaction-arrow-retrosynthetic': {
    title: i18n.t('tools.retrosyntheticArrowTool'),
    action: { tool: 'reactionarrow', opts: RxnArrowMode.Retrosynthetic },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-arrow-retrosynthetic'),
  },
  'reaction-arrow-both-ends-filled-triangle': {
    title: i18n.t('tools.arrowBothEndsFilledTriangleTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.BothEndsFilledTriangle,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(options, 'reaction-arrow-both-ends-filled-triangle'),
  },
  'reaction-arrow-equilibrium-filled-half-bow': {
    title: i18n.t('tools.arrowEquilibriumFilledHalfBowTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.EquilibriumFilledHalfBow,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(options, 'reaction-arrow-equilibrium-filled-half-bow'),
  },
  'reaction-arrow-equilibrium-filled-triangle': {
    title: i18n.t('tools.arrowEquilibriumFilledTriangleTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.EquilibriumFilledTriangle,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(options, 'reaction-arrow-equilibrium-filled-triangle'),
  },
  'reaction-arrow-equilibrium-open-angle': {
    title: i18n.t('tools.arrowEquilibriumOpenAngleTool'),
    action: { tool: 'reactionarrow', opts: RxnArrowMode.EquilibriumOpenAngle },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(options, 'reaction-arrow-equilibrium-open-angle'),
  },
  'reaction-arrow-unbalanced-equilibrium-filled-half-bow': {
    title: i18n.t('tools.arrowUnbalancedEquilibriumFilledHalfBowTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.UnbalancedEquilibriumFilledHalfBow,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(
        options,
        'reaction-arrow-unbalanced-equilibrium-filled-half-bow',
      ),
  },
  'reaction-arrow-unbalanced-equilibrium-open-half-angle': {
    title: i18n.t('tools.arrowUnbalancedEquilibriumOpenHalfAngleTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.UnbalancedEquilibriumOpenHalfAngle,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(
        options,
        'reaction-arrow-unbalanced-equilibrium-open-half-angle',
      ),
  },
  'reaction-arrow-unbalanced-equilibrium-large-filled-half-bow': {
    title: i18n.t('tools.arrowUnbalancedEquilibriumLargeFilledHalfBowTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.UnbalancedEquilibriumLargeFilledHalfBow,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(
        options,
        'reaction-arrow-unbalanced-equilibrium-large-filled-half-bow',
      ),
  },
  'reaction-arrow-unbalanced-equilibrium-filled-half-triangle': {
    title: i18n.t('tools.arrowUnbalancedEquilibriumFilledHalfTriangleTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.UnbalancedEquilibriumFilledHalfTriangle,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(
        options,
        'reaction-arrow-unbalanced-equilibrium-filled-half-triangle',
      ),
  },
  'reaction-arrow-elliptical-arc-arrow-filled-bow': {
    title: i18n.t('tools.arrowEllipticalArcFilledBowTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.EllipticalArcFilledBow,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(options, 'reaction-arrow-elliptical-arc-arrow-filled-bow'),
  },
  'reaction-arrow-elliptical-arc-arrow-filled-triangle': {
    title: i18n.t('tools.arrowEllipticalArcFilledTriangleTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.EllipticalArcFilledTriangle,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(options, 'reaction-arrow-elliptical-arc-arrow-filled-triangle'),
  },
  'reaction-arrow-elliptical-arc-arrow-open-angle': {
    title: i18n.t('tools.arrowEllipticalArcOpenAngleTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.EllipticalArcOpenAngle,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(options, 'reaction-arrow-elliptical-arc-arrow-open-angle'),
  },
  'reaction-arrow-elliptical-arc-arrow-open-half-angle': {
    title: i18n.t('tools.arrowEllipticalArcOpenHalfAngleTool'),
    action: {
      tool: 'reactionarrow',
      opts: RxnArrowMode.EllipticalArcOpenHalfAngle,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) =>
      isHidden(options, 'reaction-arrow-elliptical-arc-arrow-open-half-angle'),
  },
  [MULTITAIL_ARROW_TOOL_NAME]: {
    title: i18n.t('tools.multiTailedArrowTool'),
    action: {
      tool: 'reactionarrow',
      opts: MULTITAIL_ARROW_TOOL_NAME,
    },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, MULTITAIL_ARROW_TOOL_NAME),
  },
  'reaction-plus': {
    title: i18n.t('tools.reactionPlusTool'),
    action: { tool: 'reactionplus' },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-plus'),
  },
  'reaction-mapping-tools': {
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-mapping-tools'),
  },
  'reaction-map': {
    title: i18n.t('tools.reactionMappingTool'),
    action: { tool: 'reactionmap' },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-map'),
  },
  'reaction-unmap': {
    title: i18n.t('tools.reactionUnmappingTool'),
    action: { tool: 'reactionunmap' },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'reaction-unmap'),
  },
  rgroup: {
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'rgroup'),
  },
  'rgroup-label': {
    shortcut: 'Mod+r',
    title: i18n.t('tools.rgroupLabelTool'),
    action: { tool: 'rgroupatom' },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'rgroup-label'),
  },
  'rgroup-fragment': {
    shortcut: ['Mod+Shift+r', 'Mod+r'],
    title: i18n.t('tools.rgroupFragmentTool'),
    action: { tool: 'rgroupfragment' },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'rgroup-fragment'),
  },
  'rgroup-attpoints': {
    shortcut: 'Mod+r',
    title: i18n.t('tools.attachmentPointTool'),
    action: { tool: 'apoint' },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'rgroup-attpoints'),
  },
  [CREATE_MONOMER_TOOL_NAME]: {
    shortcut: 'Mod+m',
    title: i18n.t('tools.createMonomer'),
    action: {
      tool: CREATE_MONOMER_TOOL_NAME,
    },
    disabled: (editor) =>
      editor.isMonomerCreationWizardActive ||
      !editor.isMonomerCreationWizardEnabled,
    hidden: (options) => isHidden(options, CREATE_MONOMER_TOOL_NAME),
  },
  shapes: {
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'shapes'),
  },
  'shape-ellipse': {
    title: i18n.t('tools.shapeEllipse'),
    action: { tool: 'simpleobject', opts: SimpleObjectMode.ellipse },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'shape-ellipse'),
  },
  'shape-rectangle': {
    title: i18n.t('tools.shapeRectangle'),
    action: { tool: 'simpleobject', opts: SimpleObjectMode.rectangle },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'shape-rectangle'),
  },
  'shape-line': {
    title: i18n.t('tools.shapeLine'),
    action: { tool: 'simpleobject', opts: SimpleObjectMode.line },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'shape-line'),
  },
  text: {
    shortcut: 'Alt+t',
    title: i18n.t('tools.addText'),
    action: { tool: 'text' },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, 'text'),
  },
  bonds: {
    hidden: (options) => isHidden(options, 'bonds'),
  },
  [IMAGE_KEY]: {
    title: i18n.t('tools.addImage'),
    action: { tool: IMAGE_KEY },
    disabled: (editor) => editor.isMonomerCreationWizardActive,
    hidden: (options) => isHidden(options, IMAGE_KEY),
  },
};

const bondCuts = {
  single: '1',
  double: '2',
  triple: '3',
  up: '1',
  down: '1',
  updown: '1',
  crossed: '2',
  any: '0',
  aromatic: '4',
};

const typeSchema = bondSchema.properties.type;

const monomerWizardDisallowedBondTypes = new Set(
  MONOMER_WIZARD_DISALLOWED_BOND_TYPES,
);

export default typeSchema.enum.reduce((res, type, i) => {
  res[`bond-${type}`] = {
    title: type ? getBondDisplayTitle(type) : typeSchema.enumNames[i],
    shortcut: bondCuts[type],
    action: {
      tool: 'bond',
      opts: toBondType(type),
    },
    hidden: (options) => isHidden(options, `bond-${type}`),
    ...(monomerWizardDisallowedBondTypes.has(type) && {
      disabled: (editor) => editor.isMonomerCreationWizardActive,
    }),
  };
  return res;
}, toolActions);
