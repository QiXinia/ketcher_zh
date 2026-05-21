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
  StereoLabelStyleType,
  StereoColoringType,
  ShowHydrogenLabels,
  defaultBondThickness,
} from 'ketcher-core';
import { Validator, Schema } from 'jsonschema';
import { localizedEnumNames, localizedProperty } from './i18n';

type ExtendedSchema = Schema & {
  enumNames?: Array<string>;
  default?: any;
};

export enum MeasurementUnits {
  Px = 'px',
  Cm = 'cm',
  Pt = 'pt',
  Inch = 'inch',
}

export enum ImageResolution {
  high = '600',
  low = '72',
}

const editor: {
  resetToSelect: ExtendedSchema;
  rotationStep: ExtendedSchema;
  windowedMode: ExtendedSchema;
} = {
  resetToSelect: localizedEnumNames(
    localizedProperty(
      {
        enum: [true, 'paste', false],
        default: 'paste',
      },
      'settings.resetToSelectTool',
      'Reset to Select Tool',
    ),
    [
      { key: 'settings.on', defaultValue: 'on' },
      { key: 'settings.afterPaste', defaultValue: 'After Paste' },
      { key: 'settings.off', defaultValue: 'off' },
    ],
  ),
  rotationStep: localizedProperty(
    {
      type: 'integer',
      minimum: 1,
      maximum: 90,
      default: 15,
    },
    'settings.rotationStep',
    'Rotation Step, º',
  ),
  windowedMode: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.windowedMode',
    'Windowed mode (draggable dialogs)',
  ),
};

const render: {
  showValenceWarnings: ExtendedSchema;
  atomColoring: ExtendedSchema;
  showStereoFlags: ExtendedSchema;
  stereoLabelStyle: ExtendedSchema;
  colorOfAbsoluteCenters: ExtendedSchema;
  colorOfAndCenters: ExtendedSchema;
  colorOfOrCenters: ExtendedSchema;
  colorStereogenicCenters: ExtendedSchema;
  autoFadeOfStereoLabels: ExtendedSchema;
  absFlagLabel: ExtendedSchema;
  andFlagLabel: ExtendedSchema;
  mixedFlagLabel: ExtendedSchema;
  ignoreChiralFlag: ExtendedSchema;
  orFlagLabel: ExtendedSchema;
  font: ExtendedSchema;
  fontsz: ExtendedSchema;
  fontszUnit: ExtendedSchema;
  fontszsub: ExtendedSchema;
  fontszsubUnit: ExtendedSchema;
  carbonExplicitly: ExtendedSchema;
  showCharge: ExtendedSchema;
  showValence: ExtendedSchema;
  showHydrogenLabels: ExtendedSchema;
  aromaticCircle: ExtendedSchema;
  bondSpacing: ExtendedSchema;
  bondThickness: ExtendedSchema;
  bondThicknessUnit: ExtendedSchema;
  stereoBondWidth: ExtendedSchema;
  stereoBondWidthUnit: ExtendedSchema;
  bondLength: ExtendedSchema;
  bondLengthUnit: ExtendedSchema;
  reactionComponentMarginSize: ExtendedSchema;
  reactionComponentMarginSizeUnit: ExtendedSchema;
  hashSpacing: ExtendedSchema;
  hashSpacingUnit: ExtendedSchema;
  imageResolution: ExtendedSchema;
} = {
  showValenceWarnings: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.showValenceWarnings',
    'Show valence warnings',
  ),
  atomColoring: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.atomColoring',
    'Atom coloring',
  ),
  showStereoFlags: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.showStereoFlags',
    'Show the Stereo flags',
  ),
  stereoLabelStyle: localizedEnumNames(
    localizedProperty(
      {
        enum: [
          StereoLabelStyleType.IUPAC,
          StereoLabelStyleType.Classic,
          StereoLabelStyleType.On,
          StereoLabelStyleType.Off,
        ],
        default: StereoLabelStyleType.IUPAC,
      },
      'settings.labelDisplayStereogenicCenters',
      'Label display at stereogenic centers',
    ),
    [
      { key: 'settings.iupacStyle', defaultValue: 'IUPAC style' },
      { key: 'settings.classic', defaultValue: 'Classic' },
      { key: 'settings.on', defaultValue: 'On' },
      { key: 'settings.off', defaultValue: 'Off' },
    ],
  ),
  colorOfAbsoluteCenters: localizedProperty(
    {
      type: 'string',
      default: '#ff0000',
    },
    'settings.absoluteCenterColor',
    'Absolute Center color',
  ),
  colorOfAndCenters: localizedProperty(
    {
      type: 'string',
      default: '#0000cd',
    },
    'settings.andCentersColor',
    'AND Centers color',
  ),
  colorOfOrCenters: localizedProperty(
    {
      type: 'string',
      default: '#228b22',
    },
    'settings.orCentersColor',
    'OR Centers color',
  ),
  colorStereogenicCenters: localizedEnumNames(
    localizedProperty(
      {
        enum: [
          StereoColoringType.LabelsOnly,
          StereoColoringType.BondsOnly,
          StereoColoringType.LabelsAndBonds,
          StereoColoringType.Off,
        ],
        default: StereoColoringType.LabelsOnly,
      },
      'settings.colorStereogenicCenters',
      'Color stereogenic centers',
    ),
    [
      { key: 'settings.labelsOnly', defaultValue: 'Labels Only' },
      { key: 'settings.bondsOnly', defaultValue: 'Bonds Only' },
      { key: 'settings.labelsAndBonds', defaultValue: 'Labels And Bonds' },
      { key: 'settings.off', defaultValue: 'Off' },
    ],
  ),
  autoFadeOfStereoLabels: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.autoFadeAndOrCenterLabels',
    'Auto fade And/Or center labels',
  ),
  absFlagLabel: localizedProperty(
    {
      type: 'string',
      default: 'ABS',
    },
    'settings.textOfAbsoluteFlag',
    'Text of Absolute flag',
  ),
  andFlagLabel: localizedProperty(
    {
      type: 'string',
      default: 'AND Enantiomer',
    },
    'settings.textOfAndFlag',
    'Text of AND flag',
  ),
  mixedFlagLabel: localizedProperty(
    {
      type: 'string',
      default: 'Mixed',
    },
    'settings.textOfMixedFlag',
    'Text of Mixed flag',
  ),
  ignoreChiralFlag: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.ignoreChiralFlag',
    'Ignore the chiral flag',
  ),
  orFlagLabel: localizedProperty(
    {
      type: 'string',
      default: 'OR Enantiomer',
    },
    'settings.textOfOrFlag',
    'Text of OR flag',
  ),
  font: localizedProperty(
    {
      type: 'string',
      default: '30px Arial',
    },
    'settings.font',
    'Font',
  ),
  fontsz: localizedProperty(
    {
      type: 'number',
      default: 13,
      minimum: 0.1,
      maximum: 96,
    },
    'settings.fontSize',
    'Font size',
  ),
  fontszUnit: localizedProperty(
    {
      enum: Object.values(MeasurementUnits),
      enumNames: Object.values(MeasurementUnits),
      default: MeasurementUnits.Px,
    },
    'settings.fontSizeUnit',
    'Font size unit',
  ),
  fontszsub: localizedProperty(
    {
      type: 'number',
      default: 13,
      minimum: 0.1,
      maximum: 96,
    },
    'settings.subFontSize',
    'Sub font size',
  ),
  fontszsubUnit: localizedProperty(
    {
      enum: Object.values(MeasurementUnits),
      enumNames: Object.values(MeasurementUnits),
      default: MeasurementUnits.Px,
    },
    'settings.subFontSizeUnit',
    'Sub font size unit',
  ),
  // Atom
  carbonExplicitly: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.displayCarbonExplicitly',
    'Display carbon explicitly',
  ),
  showCharge: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.displayCharge',
    'Display charge',
  ),
  showValence: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.displayValence',
    'Display valence',
  ),
  showHydrogenLabels: localizedEnumNames(
    localizedProperty(
      {
        enum: Object.values(ShowHydrogenLabels),
        default: ShowHydrogenLabels.TerminalAndHetero,
      },
      'settings.showHydrogenLabels',
      'Show hydrogen labels',
    ),
    [
      { key: 'settings.off', defaultValue: 'Off' },
      { key: 'settings.hetero', defaultValue: 'Hetero' },
      { key: 'settings.terminal', defaultValue: 'Terminal' },
      {
        key: 'settings.terminalAndHetero',
        defaultValue: 'Terminal and Hetero',
      },
      { key: 'settings.on', defaultValue: 'On' },
    ],
  ),
  // Bonds
  aromaticCircle: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.aromaticBondsAsCircle',
    'Aromatic Bonds as circle',
  ),
  bondSpacing: localizedProperty(
    {
      type: 'integer',
      default: 15,
      minimum: 1,
      maximum: 100,
    },
    'settings.bondSpacing',
    'Bond spacing',
  ),
  bondThickness: localizedProperty(
    {
      type: 'number',
      default: defaultBondThickness,
      minimum: 0.1,
      maximum: 96,
    },
    'settings.bondThickness',
    'Bond thickness',
  ),
  bondThicknessUnit: localizedProperty(
    {
      enum: Object.values(MeasurementUnits),
      enumNames: Object.values(MeasurementUnits),
      default: MeasurementUnits.Px,
    },
    'settings.bondThicknessUnit',
    'Bond thickness unit',
  ),
  stereoBondWidth: localizedProperty(
    {
      type: 'number',
      default: 6,
      minimum: 0.1,
      maximum: 96,
    },
    'settings.stereoBondWidth',
    'Stereo (Wedge) bond width',
  ),
  stereoBondWidthUnit: localizedProperty(
    {
      enum: Object.values(MeasurementUnits),
      enumNames: Object.values(MeasurementUnits),
      default: MeasurementUnits.Px,
    },
    'settings.stereoBondWidthUnit',
    'Stereo (Wedge) bond width unit',
  ),
  bondLength: localizedProperty(
    {
      type: 'number',
      default: 40,
      minimum: 0.1,
      maximum: 1000,
    },
    'settings.bondLength',
    'Bond length',
  ),
  bondLengthUnit: localizedProperty(
    {
      enum: Object.values(MeasurementUnits),
      enumNames: Object.values(MeasurementUnits),
      default: MeasurementUnits.Px,
    },
    'settings.bondLengthUnit',
    'Bond length unit',
  ),
  reactionComponentMarginSize: localizedProperty(
    {
      type: 'number',
      default: 20,
      minimum: 0.1,
      maximum: 1000,
    },
    'settings.reactionComponentMargin',
    'Reaction component margin size',
  ),
  reactionComponentMarginSizeUnit: localizedProperty(
    {
      enum: Object.values(MeasurementUnits),
      enumNames: Object.values(MeasurementUnits),
      default: MeasurementUnits.Px,
    },
    'settings.reactionComponentMarginUnit',
    'Reaction component margin size unit',
  ),
  hashSpacing: localizedProperty(
    {
      type: 'number',
      default: 1.2,
      minimum: 0.1,
      maximum: 1000,
    },
    'settings.hashSpacing',
    'Hash spacing',
  ),
  hashSpacingUnit: localizedProperty(
    {
      enum: Object.values(MeasurementUnits),
      enumNames: Object.values(MeasurementUnits),
      default: MeasurementUnits.Px,
    },
    'settings.hashSpacingUnit',
    'Hash spacing unit',
  ),
  imageResolution: localizedProperty(
    {
      enum: Object.values(ImageResolution),
      enumNames: Object.keys(ImageResolution),
      default: ImageResolution.low,
    },
    'settings.imageResolution',
    'Image resolution',
  ),
};

const server: {
  'smart-layout': ExtendedSchema;
  'ignore-stereochemistry-errors': ExtendedSchema;
  'mass-skip-error-on-pseudoatoms': ExtendedSchema;
  'gross-formula-add-rsites': ExtendedSchema;
  'gross-formula-add-isotopes': ExtendedSchema;
  'dearomatize-on-load': ExtendedSchema;
  ignoreChiralFlag: ExtendedSchema;
} = {
  'dearomatize-on-load': localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.dearomatizeOnLoad',
    'dearomatize-on-load',
  ),
  'smart-layout': localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.smartLayout',
    'Smart-layout',
  ),
  ignoreChiralFlag: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.ignoreChiralFlag',
    'Ignore the chiral flag',
  ),
  'ignore-stereochemistry-errors': localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.ignoreStereochemistryErrors',
    'Ignore stereochemistry errors',
  ),
  'mass-skip-error-on-pseudoatoms': localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.ignorePseudoatomsAtMass',
    'Ignore pseudoatoms at mass',
  ),
  'gross-formula-add-rsites': localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.addRsitesAtMassCalculation',
    'Add Rsites at mass calculation',
  ),
  'gross-formula-add-isotopes': localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: true,
    },
    'settings.addIsotopesAtMassCalculation',
    'Add Isotopes at mass calculation',
  ),
};

export const SERVER_OPTIONS = Object.keys(server);

const debug: {
  showAtomIds: ExtendedSchema;
  showBondIds: ExtendedSchema;
  showHalfBondIds: ExtendedSchema;
  showLoopIds: ExtendedSchema;
} = {
  showAtomIds: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.showAtomIds',
    'Show atom Ids',
  ),
  showBondIds: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.showBondIds',
    'Show bonds Ids',
  ),
  showHalfBondIds: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.showHalfBondIds',
    'Show half bonds Ids',
  ),
  showLoopIds: localizedProperty(
    {
      type: 'boolean',
      description: 'slider',
      default: false,
    },
    'settings.showLoopIds',
    'Show loop Ids',
  ),
};

const miew: {
  miewMode: ExtendedSchema;
  miewTheme: ExtendedSchema;
  miewAtomLabel: ExtendedSchema;
} = {
  miewMode: localizedEnumNames(
    localizedProperty(
      {
        enum: ['LN', 'BS', 'LC'],
        default: 'LN',
      },
      'settings.displayMode',
      'Display mode',
    ),
    [
      { key: 'settings.lines', defaultValue: 'Lines' },
      { key: 'settings.ballsAndSticks', defaultValue: 'Balls and Sticks' },
      { key: 'settings.licorice', defaultValue: 'Licorice' },
    ],
  ),
  miewTheme: localizedEnumNames(
    localizedProperty(
      {
        enum: ['light', 'dark'],
        default: 'light',
      },
      'settings.backgroundColor',
      'Background color',
    ),
    [
      { key: 'settings.light', defaultValue: 'Light' },
      { key: 'settings.dark', defaultValue: 'Dark' },
    ],
  ),
  miewAtomLabel: localizedEnumNames(
    localizedProperty(
      {
        enum: ['no', 'bright', 'blackAndWhite', 'black'],
        default: 'bright',
      },
      'settings.labelColoring',
      'Label coloring',
    ),
    [
      { key: 'settings.no', defaultValue: 'No' },
      { key: 'settings.bright', defaultValue: 'Bright' },
      { key: 'settings.blackAndWhite', defaultValue: 'Black and White' },
      { key: 'settings.black', defaultValue: 'Black' },
    ],
  ),
};

export const MIEW_OPTIONS = Object.keys(miew);

const optionsSchema: ExtendedSchema = localizedProperty(
  {
    type: 'object',
    required: [],
    properties: {
      ...editor,
      ...render,
      ...server,
      ...debug,
      ...miew,
    },
  },
  'settings.title',
  'Settings',
);

export default optionsSchema;

export function getDefaultOptions(): Record<string, any> {
  const props = optionsSchema.properties;
  if (!props) return {};

  return Object.keys(props).reduce((res, prop) => {
    res[prop] = props[prop].default;
    return res;
  }, {});
}

export function validation(settings): Record<string, string> | null {
  if (typeof settings !== 'object' || settings === null) return null;

  const result = new Validator().validate(settings, optionsSchema as Schema, {
    base: 'https://ketcher.local/',
  });
  const errorsProps = result.errors.map((e) =>
    e.property.replace(/^instance\./, ''),
  );

  return Object.keys(settings).reduce((res, prop) => {
    if (!optionsSchema.properties) return res;

    if (optionsSchema.properties[prop] && !errorsProps.includes(prop))
      res[prop] = settings[prop];

    return res;
  }, {});
}
