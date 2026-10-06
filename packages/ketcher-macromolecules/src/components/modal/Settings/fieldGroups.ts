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

import { Settings } from 'ketcher-core';

export interface FieldGroup {
  id: string;
  title: string;
  fields: Array<keyof Settings>;
}

export interface FieldDefinition {
  label: string;
  type: 'checkbox' | 'number' | 'text' | 'select' | 'color';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'general',
    title: 'settings.general',
    fields: [
      'resetToSelect',
      'rotationStep',
      'showValenceWarnings',
      'atomColoring',
      'font',
      'fontsz',
      'fontszUnit',
      'fontszsub',
      'fontszsubUnit',
      'reactionComponentMarginSize',
      'reactionComponentMarginSizeUnit',
      'imageResolution',
    ],
  },
  {
    id: 'stereochemistry',
    title: 'settings.stereochemistry',
    fields: [
      'showStereoFlags',
      'stereoLabelStyle',
      'colorOfAbsoluteCenters',
      'colorOfAndCenters',
      'colorOfOrCenters',
      'colorStereogenicCenters',
      'autoFadeOfStereoLabels',
      'absFlagLabel',
      'andFlagLabel',
      'orFlagLabel',
      'mixedFlagLabel',
      'ignoreChiralFlag',
    ],
  },
  {
    id: 'atoms',
    title: 'settings.atoms',
    fields: [
      'carbonExplicitly',
      'showCharge',
      'showValence',
      'showHydrogenLabels',
    ],
  },
  {
    id: 'bonds',
    title: 'settings.bonds',
    fields: [
      'aromaticCircle',
      'bondSpacing',
      'bondThickness',
      'bondThicknessUnit',
      'stereoBondWidth',
      'stereoBondWidthUnit',
      'hashSpacing',
      'hashSpacingUnit',
    ],
  },
  {
    id: 'server',
    title: 'settings.server',
    fields: [
      'smart-layout',
      'ignore-stereochemistry-errors',
      'mass-skip-error-on-pseudoatoms',
      'gross-formula-add-rsites',
      'gross-formula-add-isotopes',
    ],
  },
  {
    id: 'viewer3d',
    title: 'settings.viewer3D',
    fields: ['miewMode', 'miewTheme', 'miewAtomLabel'],
  },
  {
    id: 'debug',
    title: 'settings.optionsForDebugging',
    fields: ['showAtomIds', 'showBondIds', 'showHalfBondIds', 'showLoopIds'],
  },
];

export const FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  // General
  resetToSelect: {
    label: 'settings.resetToSelectTool',
    type: 'select',
    options: [
      { value: true, label: 'settings.enabled' },
      { value: false, label: 'settings.disabled' },
      { value: 'paste', label: 'settings.afterPaste' },
    ],
  },
  rotationStep: {
    label: 'settings.rotationStep',
    type: 'number',
    min: 1,
    max: 90,
    step: 1,
  },
  showValenceWarnings: {
    label: 'settings.showValenceWarnings',
    type: 'checkbox',
  },
  atomColoring: {
    label: 'settings.atomColoring',
    type: 'checkbox',
  },
  font: {
    label: 'settings.font',
    type: 'select',
    // TODO: Replace with dynamic font detection (see ketcher-react/systemfonts.jsx)
    // This hardcoded list should be replaced with runtime font detection using FontFaceObserver
    // to only show fonts actually available on the user's system
    options: [
      { value: '30px Arial', label: 'Arial' },
      { value: '30px Arial Black', label: 'Arial Black' },
      { value: '30px Comic Sans MS', label: 'Comic Sans MS' },
      { value: '30px Courier New', label: 'Courier New' },
      { value: '30px Georgia', label: 'Georgia' },
      { value: '30px Impact', label: 'Impact' },
      { value: '30px Charcoal', label: 'Charcoal' },
      { value: '30px Lucida Console', label: 'Lucida Console' },
      { value: '30px Monaco', label: 'Monaco' },
      { value: '30px Palatino Linotype', label: 'Palatino Linotype' },
      { value: '30px Book Antiqua', label: 'Book Antiqua' },
      { value: '30px Palatino', label: 'Palatino' },
      { value: '30px Tahoma', label: 'Tahoma' },
      { value: '30px Geneva', label: 'Geneva' },
      { value: '30px Times New Roman', label: 'Times New Roman' },
      { value: '30px Times', label: 'Times' },
      { value: '30px Verdana', label: 'Verdana' },
      { value: '30px Symbol', label: 'Symbol' },
      { value: '30px MS Serif', label: 'MS Serif' },
      { value: '30px MS Sans Serif', label: 'MS Sans Serif' },
      { value: '30px New York', label: 'New York' },
      { value: '30px Droid Sans', label: 'Droid Sans' },
      { value: '30px Droid Serif', label: 'Droid Serif' },
      { value: '30px Droid Sans Mono', label: 'Droid Sans Mono' },
      { value: '30px Roboto', label: 'Roboto' },
    ],
  },
  fontsz: {
    label: 'settings.fontSize',
    type: 'number',
    min: 1,
    max: 96,
    step: 1,
  },
  fontszUnit: {
    label: 'settings.fontSizeUnit',
    type: 'select',
    options: [
      { value: 'px', label: 'px' },
      { value: 'pt', label: 'pt' },
      { value: 'cm', label: 'cm' },
      { value: 'inch', label: 'inch' },
    ],
  },
  fontszsub: {
    label: 'settings.subFontSize',
    type: 'number',
    min: 1,
    max: 96,
    step: 1,
  },
  fontszsubUnit: {
    label: 'settings.subFontSizeUnit',
    type: 'select',
    options: [
      { value: 'px', label: 'px' },
      { value: 'pt', label: 'pt' },
      { value: 'cm', label: 'cm' },
      { value: 'inch', label: 'inch' },
    ],
  },
  reactionComponentMarginSize: {
    label: 'settings.reactionComponentMargin',
    type: 'number',
    min: 0.1,
    max: 1000,
    step: 0.1,
  },
  reactionComponentMarginSizeUnit: {
    label: 'settings.reactionComponentMarginUnit',
    type: 'select',
    options: [
      { value: 'px', label: 'px' },
      { value: 'pt', label: 'pt' },
      { value: 'cm', label: 'cm' },
      { value: 'inch', label: 'inch' },
    ],
  },
  imageResolution: {
    label: 'settings.imageResolution',
    type: 'select',
    options: [
      { value: '72', label: 'settings.imageResLow' },
      { value: '600', label: 'settings.imageResHigh' },
    ],
  },

  // Stereochemistry
  showStereoFlags: {
    label: 'settings.showStereoFlags',
    type: 'checkbox',
  },
  stereoLabelStyle: {
    label: 'settings.labelDisplayStereogenicCenters',
    type: 'select',
    options: [
      { value: 'Iupac', label: 'settings.iupacStyle' },
      { value: 'Classic', label: 'settings.classic' },
      { value: 'On', label: 'settings.on' },
      { value: 'Off', label: 'settings.off' },
    ],
  },
  colorOfAbsoluteCenters: {
    label: 'settings.absoluteCenterColor',
    type: 'color',
  },
  colorOfAndCenters: {
    label: 'settings.andCentersColor',
    type: 'color',
  },
  colorOfOrCenters: {
    label: 'settings.orCentersColor',
    type: 'color',
  },
  colorStereogenicCenters: {
    label: 'settings.colorStereogenicCenters',
    type: 'select',
    options: [
      { value: 'LabelsOnly', label: 'settings.labelsOnly' },
      { value: 'BondsOnly', label: 'settings.bondsOnly' },
      { value: 'LabelsAndBonds', label: 'settings.labelsAndBonds' },
      { value: 'Off', label: 'settings.off' },
    ],
  },
  autoFadeOfStereoLabels: {
    label: 'settings.autoFadeStereoLabels',
    type: 'checkbox',
  },
  absFlagLabel: {
    label: 'settings.textOfAbsoluteFlag',
    type: 'text',
  },
  andFlagLabel: {
    label: 'settings.textOfAndFlag',
    type: 'text',
  },
  orFlagLabel: {
    label: 'settings.textOfOrFlag',
    type: 'text',
  },
  mixedFlagLabel: {
    label: 'settings.textOfMixedFlag',
    type: 'text',
  },
  ignoreChiralFlag: {
    label: 'settings.ignoreChiralFlag',
    type: 'checkbox',
  },

  // Atoms
  carbonExplicitly: {
    label: 'settings.displayCarbonExplicitly',
    type: 'checkbox',
  },
  showCharge: {
    label: 'settings.displayCharge',
    type: 'checkbox',
  },
  showValence: {
    label: 'settings.displayValence',
    type: 'checkbox',
  },
  showHydrogenLabels: {
    label: 'settings.showHydrogenLabels',
    type: 'select',
    options: [
      { value: 'off', label: 'settings.off' },
      { value: 'Hetero', label: 'settings.hetero' },
      { value: 'Terminal', label: 'settings.terminal' },
      { value: 'Terminal and Hetero', label: 'settings.terminalAndHetero' },
      { value: 'On', label: 'settings.on' },
    ],
  },

  // Bonds
  aromaticCircle: {
    label: 'settings.aromaticBondsAsCircle',
    type: 'checkbox',
  },
  bondSpacing: {
    label: 'settings.bondSpacing',
    type: 'number',
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  bondThickness: {
    label: 'settings.bondThickness',
    type: 'number',
    min: 0.1,
    max: 96,
    step: 0.1,
  },
  bondThicknessUnit: {
    label: 'settings.bondThicknessUnit',
    type: 'select',
    options: [
      { value: 'px', label: 'px' },
      { value: 'pt', label: 'pt' },
      { value: 'cm', label: 'cm' },
      { value: 'inch', label: 'inch' },
    ],
  },
  stereoBondWidth: {
    label: 'settings.stereoBondWidth',
    type: 'number',
    min: 0.1,
    max: 96,
    step: 0.1,
  },
  stereoBondWidthUnit: {
    label: 'settings.stereoBondWidthUnit',
    type: 'select',
    options: [
      { value: 'px', label: 'px' },
      { value: 'pt', label: 'pt' },
      { value: 'cm', label: 'cm' },
      { value: 'inch', label: 'inch' },
    ],
  },
  hashSpacing: {
    label: 'settings.hashSpacing',
    type: 'number',
    min: 0.1,
    max: 1000,
    step: 0.1,
  },
  hashSpacingUnit: {
    label: 'settings.hashSpacingUnit',
    type: 'select',
    options: [
      { value: 'px', label: 'px' },
      { value: 'pt', label: 'pt' },
      { value: 'cm', label: 'cm' },
      { value: 'inch', label: 'inch' },
    ],
  },

  // Server
  'smart-layout': {
    label: 'settings.smartLayout',
    type: 'checkbox',
  },
  'ignore-stereochemistry-errors': {
    label: 'settings.ignoreStereochemistryErrors',
    type: 'checkbox',
  },
  'mass-skip-error-on-pseudoatoms': {
    label: 'settings.ignorePseudoatomsAtMass',
    type: 'checkbox',
  },
  'gross-formula-add-rsites': {
    label: 'settings.addRsitesAtMassCalculation',
    type: 'checkbox',
  },
  'gross-formula-add-isotopes': {
    label: 'settings.addIsotopesAtMassCalculation',
    type: 'checkbox',
  },

  // 3D Viewer
  miewMode: {
    label: 'settings.miewMode',
    type: 'select',
    options: [
      { value: 'LN', label: 'settings.lines' },
      { value: 'BS', label: 'settings.ballsAndSticks' },
      { value: 'LC', label: 'settings.licorice' },
    ],
  },
  miewTheme: {
    label: 'settings.miewTheme',
    type: 'select',
    options: [
      { value: 'light', label: 'settings.light' },
      { value: 'dark', label: 'settings.dark' },
    ],
  },
  miewAtomLabel: {
    label: 'settings.miewAtomLabel',
    type: 'select',
    options: [
      { value: 'no', label: 'settings.none' },
      { value: 'bright', label: 'settings.bright' },
      { value: 'blackAndWhite', label: 'settings.blackAndWhite' },
      { value: 'black', label: 'settings.black' },
    ],
  },

  // Debug
  showAtomIds: {
    label: 'settings.showAtomIds',
    type: 'checkbox',
  },
  showBondIds: {
    label: 'settings.showBondIds',
    type: 'checkbox',
  },
  showHalfBondIds: {
    label: 'settings.showHalfBondIds',
    type: 'checkbox',
  },
  showLoopIds: {
    label: 'settings.showLoopIds',
    type: 'checkbox',
  },
};
