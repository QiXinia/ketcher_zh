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

import { mapOf } from './schema-helper';
import i18n from '../../../../i18n';

const radioButtonsSchema = {
  enum: ['Absolute', 'Relative', 'Attached'],
  default: 'Absolute',
};

const contextSchema = {
  get title() {
    return i18n.t('sdata.context');
  },
  enum: ['Fragment', 'Multifragment', 'Bond', 'Atom', 'Group'],
  default: 'Fragment',
};

const sData = {
  Fragment: {
    get title() {
      return i18n.t('sdata.fragment');
    },
    type: 'Object',
    oneOf: [
      {
        key: 'FRG_STR',
        title: 'MDLBG_FRAGMENT_STEREO',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['MDLBG_FRAGMENT_STEREO'],
            default: 'MDLBG_FRAGMENT_STEREO',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            enum: [
              'abs',
              '(+)-enantiomer',
              '(-)-enantiomer',
              'racemate',
              'steric',
              'rel',
              'R(a)',
              'S(a)',
              'R(p)',
              'S(p)',
            ],
            default: 'abs',
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
      {
        key: 'FRG_COEFF',
        title: 'MDLBG_FRAGMENT_COEFFICIENT',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['MDLBG_FRAGMENT_COEFFICIENT'],
            default: 'MDLBG_FRAGMENT_COEFFICIENT',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            type: 'string',
            default: '',
            minLength: 1,
            get invalidMessage() {
              return i18n.t('sdata.specifyFieldValue');
            },
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
      {
        key: 'FRG_CHRG',
        title: 'MDLBG_FRAGMENT_CHARGE',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['MDLBG_FRAGMENT_CHARGE'],
            default: 'MDLBG_FRAGMENT_CHARGE',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            type: 'string',
            default: '',
            minLength: 1,
            get invalidMessage() {
              return i18n.t('sdata.specifyFieldValue');
            },
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
      {
        key: 'FRG_RAD',
        title: 'MDLBG_FRAGMENT_RADICALS',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['MDLBG_FRAGMENT_RADICALS'],
            default: 'MDLBG_FRAGMENT_RADICALS',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            type: 'string',
            default: '',
            minLength: 1,
            get invalidMessage() {
              return i18n.t('sdata.specifyFieldValue');
            },
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
    ],
  },
  Multifragment: {
    get title() {
      return i18n.t('sdata.multifragment');
    },
    type: 'Object',
    oneOf: [
      {
        key: 'MLT_FRG',
        title: 'KETCHER_MULTIPLE_FRAGMENT',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['KETCHER_MULTIPLE_FRAGMENT'],
            default: 'KETCHER_MULTIPLE_FRAGMENT',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            enum: [
              'aerosol',
              'alloy',
              'catenane',
              'complex',
              'composite',
              'co-polymer',
              'emulsion',
              'host-guest complex',
              'mixture',
              'rotaxane',
              'suspension',
            ],
            default: 'aerosol',
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
    ],
  },
  Bond: {
    get title() {
      return i18n.t('sdata.bond');
    },
    type: 'Object',
    oneOf: [
      {
        key: 'SB_STR',
        title: 'MDLBG_STEREO_KEY',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['MDLBG_STEREO_KEY'],
            default: 'MDLBG_STEREO_KEY',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            enum: [
              'erythro',
              'threo',
              'alpha',
              'beta',
              'endo',
              'exo',
              'anti',
              'syn',
              'ECL',
              'STG',
            ],
            default: 'erythro',
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
      {
        key: 'SB_BND',
        title: 'MDLBG_BOND_KEY',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['MDLBG_BOND_KEY'],
            default: 'MDLBG_BOND_KEY',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            enum: ['Value=4'],
            default: 'Value=4',
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
    ],
  },
  Atom: {
    get title() {
      return i18n.t('sdata.atom');
    },
    type: 'Object',
    oneOf: [
      {
        key: 'AT_STR',
        title: 'MDLBG_STEREO_KEY',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['MDLBG_STEREO_KEY'],
            default: 'MDLBG_STEREO_KEY',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            enum: [
              'RS',
              'SR',
              'P-3',
              'P-3-PI',
              'SP-4',
              'SP-4-PI',
              'T-4',
              'T-4-PI',
              'SP-5',
              'SP-5-PI',
              'TB-5',
              'TB-5-PI',
              'OC-6',
              'TP-6',
              'PB-7',
              'CU-8',
              'SA-8',
              'DD-8',
              'HB-9',
              'TPS-9',
            ],
            default: 'RS',
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
    ],
  },
  Group: {
    get title() {
      return i18n.t('sdata.group');
    },
    type: 'Object',
    oneOf: [
      {
        key: 'GRP_STR',
        title: 'MDLBG_STEREO_KEY',
        type: 'object',
        properties: {
          type: { enum: ['DAT'] },
          fieldName: {
            get title() {
              return i18n.t('sdata.fieldName');
            },
            enum: ['MDLBG_STEREO_KEY'],
            default: 'MDLBG_STEREO_KEY',
          },
          fieldValue: {
            get title() {
              return i18n.t('sdata.fieldValue');
            },
            enum: ['cis', 'trans'],
            default: 'cis',
          },
          radiobuttons: radioButtonsSchema,
        },
        required: ['fieldName', 'fieldValue', 'radiobuttons'],
      },
    ],
  },
};

export const sdataCustomSchema = {
  key: 'Custom',
  get title() {
    return i18n.t('sdata.data');
  },
  type: 'object',
  properties: {
    type: { enum: ['DAT'] },
    context: {
      get title() {
        return i18n.t('sdata.context');
      },
      enum: ['Atom', 'Bond', 'Fragment', 'Group', 'Multifragment'],
      default: 'Fragment',
    },
    fieldName: {
      get title() {
        return i18n.t('sdata.fieldName');
      },
      type: 'string',
      default: '',
      minLength: 1,
      get invalidMessage() {
        return i18n.t('sdata.specifyFieldName');
      },
    },
    fieldValue: {
      get title() {
        return i18n.t('sdata.fieldValue');
      },
      type: 'string',
      default: '',
      minLength: 1,
      get invalidMessage() {
        return i18n.t('sdata.specifyFieldValue');
      },
    },
    radiobuttons: {
      enum: ['Absolute', 'Relative', 'Attached'],
      default: 'Absolute',
    },
  },
  required: ['context', 'fieldName', 'fieldValue', 'radiobuttons'],
};

export const sdataSchema = Object.keys(sData).reduce((acc, title) => {
  acc[title] = mapOf(sData[title], 'fieldName');
  Object.keys(acc[title]).forEach((fieldName) => {
    acc[title][fieldName].properties.context = contextSchema;
  });
  return acc;
}, {});

/**
 * Returns first key of passed object
 * @param obj { object }
 */
function firstKeyOf(obj) {
  return Object.keys(obj)[0];
}

/**
 * Returns schema default values. Depends on passed arguments:
 * pass schema only -> returns default context
 * pass schema & context -> returns default fieldName
 * pass schema & context & fieldName -> returns default fieldValue
 * @param context? { string }
 * @param fieldName? { string }
 * @returns { string }
 */
export function getSdataDefault(
  schema = sdataSchema,
  context = undefined,
  fieldName = undefined,
) {
  if (schema.key === 'Custom') {
    return schema.properties[context]?.default;
  }

  if (!context && !fieldName) return firstKeyOf(schema);

  if (!fieldName) return firstKeyOf(schema[context]);

  return schema[context][fieldName]
    ? schema[context][fieldName].properties.fieldValue.default
    : '';
}
