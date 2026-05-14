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
import { range } from 'lodash/fp';
import { sdataCustomSchema } from './sdata-schema';
import {
  localizedEnumNames,
  localizedInvalidMessage,
  localizedProperty,
} from './i18n';

interface CommonStructSchema {
  key?: string;
  title: string;
  type?: string;
  required?: string[];
}

export interface SchemaProperty extends CommonStructSchema {
  enum?: unknown[];
  enumNames?: string[];
  default?: unknown;
  format?: string;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  invalidMessage?: string | ((data: unknown) => string);
}

export interface StructSchema<
  T = Record<string, SchemaProperty | Record<string, unknown>>,
> extends CommonStructSchema {
  properties: T;
}

type ExtendedSchemaProperty = Record<string, unknown>;

interface AtomProperties extends Record<string, SchemaProperty> {
  alias: SchemaProperty;
  aromaticity: SchemaProperty;
  atomList: SchemaProperty;
  atomType: SchemaProperty;
  charge: SchemaProperty;
  chirality: SchemaProperty;
  cip: SchemaProperty;
  connectivity: SchemaProperty;
  customQuery: SchemaProperty;
  exactChangeFlag: SchemaProperty;
  explicitValence: SchemaProperty;
  hCount: SchemaProperty;
  implicitHCount: SchemaProperty;
  invRet: SchemaProperty;
  isotope: SchemaProperty;
  label: SchemaProperty;
  notList: SchemaProperty;
  pseudo: SchemaProperty;
  radical: SchemaProperty;
  ringBondCount: SchemaProperty;
  ringMembership: SchemaProperty;
  ringSize: SchemaProperty;
  substitutionCount: SchemaProperty;
  unsaturatedAtom: SchemaProperty;
}

export const atom: StructSchema<AtomProperties> = {
  title: 'Atom',
  type: 'object',
  required: ['label'],
  properties: {
    atomType: localizedEnumNames(
      localizedProperty(
        {
          enum: ['single', 'list', 'pseudo'],
          default: 'single',
        } as ExtendedSchemaProperty,
        'atomProperties.atomType',
        'Atom Type',
      ),
      [
        { key: 'atomProperties.single', defaultValue: 'Single' },
        { key: 'atomProperties.list', defaultValue: 'List' },
        { key: 'atomProperties.special', defaultValue: 'Special' },
      ],
    ) as unknown as SchemaProperty,
    label: localizedInvalidMessage(
      localizedProperty(
        {
          type: 'string', // TODO:should really be enum of elements
          maxLength: 3,
        } as ExtendedSchemaProperty,
        'atomProperties.label',
        'Label',
      ),
      'atomProperties.wrongLabel',
      'Wrong label',
    ) as unknown as SchemaProperty,
    atomList: localizedInvalidMessage(
      localizedProperty(
        {
          type: 'string',
        } as ExtendedSchemaProperty,
        'atomProperties.list',
        'List',
      ),
      'atomProperties.invalidAtomList',
      'Invalid atom list',
    ) as unknown as SchemaProperty,
    notList: localizedProperty(
      {
        type: 'boolean',
        default: false,
      } as ExtendedSchemaProperty,
      'atomProperties.notList',
      'Not list',
    ) as unknown as SchemaProperty,
    pseudo: localizedInvalidMessage(
      localizedProperty(
        {
          type: 'string',
        } as ExtendedSchemaProperty,
        'atomProperties.special',
        'Special',
      ),
      'atomProperties.invalidSpecialAtom',
      'Invalid special atom',
    ) as unknown as SchemaProperty,
    alias: localizedInvalidMessage(
      localizedProperty(
        {
          type: 'string',
        } as ExtendedSchemaProperty,
        'atomProperties.alias',
        'Alias',
      ),
      'atomProperties.leadingTrailingSpacesNotAllowed',
      'Leading and trailing spaces are not allowed',
    ) as unknown as SchemaProperty,
    charge: localizedInvalidMessage(
      localizedProperty(
        {
          type: 'string',
          pattern: '^([+-]?)(1[0-5]|0|[0-9])([+-]?)$',
          maxLength: 4,
          default: '',
        } as ExtendedSchemaProperty,
        'atomProperties.charge',
        'Charge',
      ),
      'atomProperties.invalidChargeValue',
      'Invalid charge value',
    ) as unknown as SchemaProperty,
    explicitValence: localizedEnumNames(
      localizedProperty(
        {
          enum: [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8],
          default: -1,
        } as ExtendedSchemaProperty,
        'atomProperties.valence',
        'Valence',
      ),
      [
        { key: '', defaultValue: '' },
        { key: '', defaultValue: '0' },
        { key: '', defaultValue: 'I' },
        { key: '', defaultValue: 'II' },
        { key: '', defaultValue: 'III' },
        { key: '', defaultValue: 'IV' },
        { key: '', defaultValue: 'V' },
        { key: '', defaultValue: 'VI' },
        { key: '', defaultValue: 'VII' },
        { key: '', defaultValue: 'VIII' },
      ],
    ) as unknown as SchemaProperty,
    isotope: localizedInvalidMessage(
      localizedProperty(
        {
          type: 'string',
          pattern: '^[0-9]{1,3}$|(^$)',
          default: '',
          maxLength: 3,
        } as ExtendedSchemaProperty,
        'atomProperties.isotope',
        'Isotope (atomic mass)',
      ),
      'atomProperties.invalidIsotopeValue',
      'Invalid isotope value',
    ) as unknown as SchemaProperty,
    radical: localizedEnumNames(
      localizedProperty(
        {
          enum: [0, 2, 1, 3],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.radical',
        'Radical',
      ),
      [
        { key: '', defaultValue: '' },
        { key: 'atomProperties.monoradical', defaultValue: 'Monoradical' },
        {
          key: 'atomProperties.diradicalSinglet',
          defaultValue: 'Diradical (singlet)',
        },
        {
          key: 'atomProperties.diradicalTriplet',
          defaultValue: 'Diradical (triplet)',
        },
      ],
    ) as unknown as SchemaProperty,
    cip: localizedProperty(
      {
        type: 'string',
        enum: ['R', 'S', 'r', 's'],
      } as ExtendedSchemaProperty,
      'atomProperties.cip',
      'CIP',
    ) as unknown as SchemaProperty,
    ringBondCount: localizedEnumNames(
      localizedProperty(
        {
          enum: [0, -2, -1, 2, 3, 4, 5, 6, 7, 8, 9],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.ringBondCount',
        'Ring bond count',
      ),
      [
        { key: '', defaultValue: '' },
        { key: 'atomProperties.asDrawn', defaultValue: 'As drawn' },
        { key: '', defaultValue: '0' },
        { key: '', defaultValue: '2' },
        { key: '', defaultValue: '3' },
        { key: '', defaultValue: '4' },
        { key: '', defaultValue: '5' },
        { key: '', defaultValue: '6' },
        { key: '', defaultValue: '7' },
        { key: '', defaultValue: '8' },
        { key: '', defaultValue: '9' },
      ],
    ) as unknown as SchemaProperty,
    hCount: localizedEnumNames(
      localizedProperty(
        {
          enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.hCount',
        'H count',
      ),
      [
        { key: '', defaultValue: '' },
        { key: '', defaultValue: '0' },
        { key: '', defaultValue: '1' },
        { key: '', defaultValue: '2' },
        { key: '', defaultValue: '3' },
        { key: '', defaultValue: '4' },
        { key: '', defaultValue: '5' },
        { key: '', defaultValue: '6' },
        { key: '', defaultValue: '7' },
        { key: '', defaultValue: '8' },
        { key: '', defaultValue: '9' },
      ],
    ) as unknown as SchemaProperty,
    substitutionCount: localizedEnumNames(
      localizedProperty(
        {
          enum: [0, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.substitutionCount',
        'Substitution count',
      ),
      [
        { key: '', defaultValue: '' },
        { key: 'atomProperties.asDrawn', defaultValue: 'As drawn' },
        { key: '', defaultValue: '0' },
        { key: '', defaultValue: '1' },
        { key: '', defaultValue: '2' },
        { key: '', defaultValue: '3' },
        { key: '', defaultValue: '4' },
        { key: '', defaultValue: '5' },
        { key: '', defaultValue: '6' },
        { key: '', defaultValue: '7' },
        { key: '', defaultValue: '8' },
        { key: '', defaultValue: '9' },
      ],
    ) as unknown as SchemaProperty,
    unsaturatedAtom: localizedProperty(
      {
        type: 'boolean',
        default: false,
      } as ExtendedSchemaProperty,
      'atomProperties.unsaturated',
      'Unsaturated',
    ) as unknown as SchemaProperty,
    aromaticity: localizedEnumNames(
      localizedProperty(
        {
          enum: [null, 'aromatic', 'aliphatic'],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.aromaticity',
        'Aromaticity',
      ),
      [
        { key: '', defaultValue: '' },
        { key: 'atomProperties.aromatic', defaultValue: 'aromatic' },
        { key: 'atomProperties.aliphatic', defaultValue: 'aliphatic' },
      ],
    ) as unknown as SchemaProperty,
    implicitHCount: localizedEnumNames(
      localizedProperty(
        {
          enum: [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.implicitHCount',
        'Implicit H count',
      ),
      [
        { key: '', defaultValue: '' },
        { key: '', defaultValue: '0' },
        { key: '', defaultValue: '1' },
        { key: '', defaultValue: '2' },
        { key: '', defaultValue: '3' },
        { key: '', defaultValue: '4' },
        { key: '', defaultValue: '5' },
        { key: '', defaultValue: '6' },
        { key: '', defaultValue: '7' },
        { key: '', defaultValue: '8' },
        { key: '', defaultValue: '9' },
      ],
    ) as unknown as SchemaProperty,
    ringMembership: localizedEnumNames(
      localizedProperty(
        {
          enum: [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.ringMembership',
        'Ring membership',
      ),
      [
        { key: '', defaultValue: '' },
        { key: '', defaultValue: '0' },
        { key: '', defaultValue: '1' },
        { key: '', defaultValue: '2' },
        { key: '', defaultValue: '3' },
        { key: '', defaultValue: '4' },
        { key: '', defaultValue: '5' },
        { key: '', defaultValue: '6' },
        { key: '', defaultValue: '7' },
        { key: '', defaultValue: '8' },
        { key: '', defaultValue: '9' },
      ],
    ) as unknown as SchemaProperty,
    ringSize: localizedEnumNames(
      localizedProperty(
        {
          enum: [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.ringSize',
        'Ring size',
      ),
      [
        { key: '', defaultValue: '' },
        { key: '', defaultValue: '0' },
        { key: '', defaultValue: '1' },
        { key: '', defaultValue: '2' },
        { key: '', defaultValue: '3' },
        { key: '', defaultValue: '4' },
        { key: '', defaultValue: '5' },
        { key: '', defaultValue: '6' },
        { key: '', defaultValue: '7' },
        { key: '', defaultValue: '8' },
        { key: '', defaultValue: '9' },
      ],
    ) as unknown as SchemaProperty,
    connectivity: localizedEnumNames(
      localizedProperty(
        {
          enum: [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.connectivity',
        'Connectivity',
      ),
      [
        { key: '', defaultValue: '' },
        { key: '', defaultValue: '0' },
        { key: '', defaultValue: '1' },
        { key: '', defaultValue: '2' },
        { key: '', defaultValue: '3' },
        { key: '', defaultValue: '4' },
        { key: '', defaultValue: '5' },
        { key: '', defaultValue: '6' },
        { key: '', defaultValue: '7' },
        { key: '', defaultValue: '8' },
        { key: '', defaultValue: '9' },
      ],
    ) as unknown as SchemaProperty,
    chirality: localizedEnumNames(
      localizedProperty(
        {
          enum: [null, 'anticlockwise', 'clockwise'],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.chirality',
        'Chirality',
      ),
      [
        { key: '', defaultValue: '' },
        {
          key: 'atomProperties.anticlockwise',
          defaultValue: 'anticlockwise',
        },
        { key: 'atomProperties.clockwise', defaultValue: 'clockwise' },
      ],
    ) as unknown as SchemaProperty,
    customQuery: localizedInvalidMessage(
      localizedProperty(
        {
          pattern: '[^ ]',
          type: 'string',
        } as ExtendedSchemaProperty,
        'atomProperties.customQuery',
        'Custom Query',
      ),
      'atomProperties.invalidCustomQuery',
      'Invalid custom query',
    ) as unknown as SchemaProperty,
    invRet: localizedEnumNames(
      localizedProperty(
        {
          enum: [0, 1, 2],
          default: 0,
        } as ExtendedSchemaProperty,
        'atomProperties.inversion',
        'Inversion',
      ),
      [
        { key: '', defaultValue: '' },
        { key: 'atomProperties.inverts', defaultValue: 'Inverts' },
        { key: 'atomProperties.retains', defaultValue: 'Retains' },
      ],
    ) as unknown as SchemaProperty,
    exactChangeFlag: localizedProperty(
      {
        type: 'boolean',
        default: false,
      } as ExtendedSchemaProperty,
      'atomProperties.exactChange',
      'Exact change',
    ) as unknown as SchemaProperty,
  },
};

export const rgroupSchema: StructSchema = localizedProperty(
  {
    title: 'R-Group',
    type: 'object',
    properties: {
      values: {
        type: 'array',
        items: {
          type: 'string',
          enum: range(1, 33),
          enumNames: range(1, 33).map((item: number) => 'R' + item),
        },
      },
    },
  } as unknown as Record<string, unknown>,
  'rgroup.title',
  'R-Group',
) as unknown as StructSchema;

export const labelEdit: StructSchema = localizedProperty(
  {
    title: 'Label Edit',
    type: 'object',
    required: ['label'],
    properties: {
      label: localizedInvalidMessage(
        localizedProperty(
          {
            default: '',
            type: 'string',
          } as ExtendedSchemaProperty,
          'atomProperties.atom',
          'Atom',
        ),
        'atomProperties.wrongLabel',
        'Wrong atom symbol',
      ) as unknown as SchemaProperty,
    },
  } as unknown as Record<string, unknown>,
  'rgroup.labelEdit',
  'Label Edit',
) as unknown as StructSchema;

export const attachmentPoints: StructSchema = {
  title: 'Attachment Points',
  type: 'object',
  properties: {
    primary: localizedProperty(
      {
        type: 'boolean',
      } as ExtendedSchemaProperty,
      'rgroup.primaryAttachmentPoint',
      'Primary attachment point',
    ) as unknown as SchemaProperty,
    secondary: localizedProperty(
      {
        type: 'boolean',
      } as ExtendedSchemaProperty,
      'rgroup.secondaryAttachmentPoint',
      'Secondary attachment point',
    ) as unknown as SchemaProperty,
  },
};

export const bond: StructSchema = {
  title: 'Bond',
  type: 'object',
  required: ['type'],
  properties: {
    type: localizedEnumNames(
      localizedProperty(
        {
          enum: [
            '',
            'single',
            'up',
            'down',
            'updown',
            'double',
            'crossed',
            'triple',
            'aromatic',
            'any',
            'hydrogen',
            'singledouble',
            'singlearomatic',
            'doublearomatic',
            'dative',
          ],
          default: 'single',
        } as ExtendedSchemaProperty,
        'bondProperties.type',
        'Type',
      ),
      [
        { key: '', defaultValue: '' },
        { key: 'bondProperties.single', defaultValue: 'Single' },
        { key: 'bondProperties.singleUp', defaultValue: 'Single Up' },
        { key: 'bondProperties.singleDown', defaultValue: 'Single Down' },
        {
          key: 'bondProperties.singleUpDown',
          defaultValue: 'Single Up/Down',
        },
        { key: 'bondProperties.double', defaultValue: 'Double' },
        {
          key: 'bondProperties.doubleCisTrans',
          defaultValue: 'Double Cis/Trans',
        },
        { key: 'bondProperties.triple', defaultValue: 'Triple' },
        { key: 'bondProperties.aromatic', defaultValue: 'Aromatic' },
        { key: 'bondProperties.any', defaultValue: 'Any' },
        { key: 'bondProperties.hydrogen', defaultValue: 'Hydrogen' },
        {
          key: 'bondProperties.singleDouble',
          defaultValue: 'Single/Double',
        },
        {
          key: 'bondProperties.singleAromatic',
          defaultValue: 'Single/Aromatic',
        },
        {
          key: 'bondProperties.doubleAromatic',
          defaultValue: 'Double/Aromatic',
        },
        { key: 'bondProperties.dative', defaultValue: 'Dative' },
      ],
    ) as unknown as SchemaProperty,
    topology: localizedEnumNames(
      localizedProperty(
        {
          enum: [null, 0, 1, 2],
          default: 0,
        } as ExtendedSchemaProperty,
        'bondProperties.topology',
        'Topology',
      ),
      [
        { key: '', defaultValue: '' },
        { key: 'bondProperties.either', defaultValue: 'Either' },
        { key: 'bondProperties.ring', defaultValue: 'Ring' },
        { key: 'bondProperties.chain', defaultValue: 'Chain' },
      ],
    ) as unknown as SchemaProperty,
    customQuery: localizedInvalidMessage(
      localizedProperty(
        {
          pattern: '[^ ]',
          type: 'string',
        } as ExtendedSchemaProperty,
        'atomProperties.customQuery',
        'Custom Query',
      ),
      'atomProperties.invalidCustomQuery',
      'Invalid custom query',
    ) as unknown as SchemaProperty,
    center: localizedEnumNames(
      localizedProperty(
        {
          enum: [null, 0, -1, 1, 2, 4, 8, 12], // 5, 9, 13
          default: 0,
        } as ExtendedSchemaProperty,
        'bondProperties.reactingCenter',
        'Reacting Center',
      ),
      [
        { key: '', defaultValue: '' },
        { key: 'bondProperties.unmarked', defaultValue: 'Unmarked' },
        { key: 'bondProperties.notCenter', defaultValue: 'Not center' },
        { key: 'bondProperties.center', defaultValue: 'Center' },
        { key: 'bondProperties.noChange', defaultValue: 'No change' },
        { key: 'bondProperties.madeBroken', defaultValue: 'Made/broken' },
        {
          key: 'bondProperties.orderChanges',
          defaultValue: 'Order changes',
        },
        {
          key: 'bondProperties.madeBrokenAndChanges',
          defaultValue: 'Made/broken and changes',
        },
      ],
    ) as unknown as SchemaProperty,
    cip: localizedProperty(
      {
        type: 'string',
        enum: ['E', 'Z', 'M', 'P'],
      } as ExtendedSchemaProperty,
      'atomProperties.cip',
      'CIP',
    ) as unknown as SchemaProperty,
  },
};

const sgroup: Omit<StructSchema, 'properties'> & {
  oneOf?: Partial<StructSchema>[];
} = {
  title: 'SGroup',
  type: 'object',
  required: ['type'],
  oneOf: [
    {
      ...sdataCustomSchema,
    },
    {
      key: 'MUL',
      title: 'Multiple group',
      type: 'object',
      properties: {
        type: { enum: ['MUL'] },
        mul: {
          title: 'Repeat count',
          type: 'integer',
          default: 1,
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['mul'],
    },
    {
      key: 'SRU',
      title: 'SRU polymer',
      type: 'object',
      properties: {
        type: { enum: ['SRU'] },
        subscript: {
          title: 'Polymer label',
          type: 'string',
          default: 'n',
          // any string, except empty and including double quotes
          pattern: '^(?!\\s*$)[^"]+$',
          invalidMessage:
            'SRU subscript should not be empty and contain double quotes',
        },
        connectivity: {
          title: 'Repeat Pattern',
          enum: ['ht', 'hh', 'eu'],
          enumNames: ['Head-to-tail', 'Head-to-head', 'Either unknown'],
          default: 'ht',
        },
      },
      required: ['subscript', 'connectivity'],
    },
    {
      key: 'COP',
      title: 'Copolymer',
      type: 'object',
      properties: {
        type: { enum: ['COP'] },
        subtype: {
          title: 'Subtype',
          enum: ['ran', 'blo', 'alt'],
          enumNames: ['Random', 'Block', 'Alternating'],
        },
        connectivity: {
          title: 'Repeat Pattern',
          enum: ['ht', 'hh', 'eu'],
          enumNames: ['Head-to-tail', 'Head-to-head', 'Either unknown'],
          default: 'ht',
        },
      },
      required: ['connectivity'],
    },
    {
      key: 'SUP',
      title: 'Superatom',
      type: 'object',
      properties: {
        type: { enum: ['SUP'] },
        name: {
          title: 'Name',
          type: 'string',
          default: '',
          minLength: 1,
          invalidMessage: 'Please, provide a name for the superatom',
        },
      },
      required: ['name'],
    },
    {
      key: 'queryComponent',
      title: 'Query component',
      type: 'object',
      properties: {
        type: { enum: ['queryComponent'] },
      },
    },
    {
      key: 'nucleotideComponent',
      title: 'Nucleotide Component',
      type: 'object',
      properties: {
        type: { enum: ['nucleotideComponent'] },
        class: {
          title: 'Component',
          enum: ['SUGAR', 'BASE', 'PHOSPHATE'],
          enumNames: ['Sugar', 'Base', 'Phosphate'],
          default: 'Sugar',
        },
      },
      required: ['class'],
    },
  ],
};

export const sgroupMap: Record<string, StructSchema> = mapOf(sgroup, 'type');

export const rgroupLogic: StructSchema = localizedProperty(
  {
    title: 'R-Group',
    type: 'object',
    properties: {
      range: localizedInvalidMessage(
        localizedProperty(
          {
            type: 'string',
            maxLength: 50,
          } as ExtendedSchemaProperty,
          'rgroup.occurrence',
          'Occurrence',
        ),
        'rgroup.wrongValue',
        'Wrong value',
      ) as unknown as SchemaProperty,
      resth: localizedProperty(
        {
          type: 'boolean',
        } as ExtendedSchemaProperty,
        'rgroup.resth',
        'RestH',
      ) as unknown as SchemaProperty,
      ifthen: localizedProperty(
        {
          type: 'integer',
          minimum: 0,
        } as ExtendedSchemaProperty,
        'rgroup.condition',
        'Condition',
      ) as unknown as SchemaProperty,
    },
  } as unknown as Record<string, unknown>,
  'rgroup.logicCondition',
  'R-Group',
) as unknown as StructSchema;

export const textSchema: StructSchema = {
  title: 'Text Edit',
  type: 'object',
  required: ['label'],
  properties: {
    label: {
      default: '',
      type: 'string',
    },
  },
};

export const attachSchema: StructSchema = {
  title: 'Template edit',
  type: 'object',
  required: ['name'],
  properties: {
    name: localizedInvalidMessage(
      localizedProperty(
        {
          type: 'string',
          minLength: 1,
          maxLength: 128,
        } as ExtendedSchemaProperty,
        'templates.moleculeName',
        'Molecule name',
      ),
      'templates.invalidTemplateName',
      'Template must have a unique name and no more than 128 symbols in length',
    ) as unknown as SchemaProperty,
  },
};
