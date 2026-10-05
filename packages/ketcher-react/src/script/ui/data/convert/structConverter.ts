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
  type Atom,
  type Struct,
  type SupportedFormat,
  Bond,
  RxnArrowMode,
  StereoFlag,
  getPropertiesByFormat,
} from 'ketcher-core';
import i18n from '../../../../i18n';

export function couldBeSaved(
  struct: Struct,
  format: SupportedFormat,
): string | null {
  const warnings: Array<string> = [];
  const formatName: string = getPropertiesByFormat(format).name;

  const rxnArrowsSize = struct.rxnArrows.size;
  const hasRxnArrow = struct.hasRxnArrow();

  if (format === 'smarts') {
    const arrayOfAtoms: Array<Atom> = Array.from(struct.atoms.values());
    const arrayOfBonds: Array<Bond> = Array.from(struct.bonds.values());

    const atomsHaveUnsupportedProperties = arrayOfAtoms.some(
      (atom) =>
        atom.radical ||
        atom.unsaturatedAtom ||
        atom.exactChangeFlag ||
        atom.invRet,
    );
    const bondsHaveUnsupportedProperties = arrayOfBonds.some(
      (bond) =>
        Boolean(bond.reactingCenterStatus) ||
        bond.type === Bond.PATTERN.TYPE.DATIVE ||
        bond.type === Bond.PATTERN.TYPE.HYDROGEN,
    );
    if (bondsHaveUnsupportedProperties || atomsHaveUnsupportedProperties) {
      warnings.push(i18n.t('saveWarnings.smartsQueryProps'));
    }
  }

  if (format === 'smiles') {
    const arrayOfAtoms: Array<any> = Array.from(struct.atoms.values());
    const hasGenerics = arrayOfAtoms.some((atom) => atom.pseudo);
    if (hasGenerics) {
      warnings.push(i18n.t('saveWarnings.smilesGenericAtoms'));
    }
  }

  if (format !== 'ket') {
    if (hasRxnArrow) {
      const arrayOfArrows: Array<any> = Array.from(struct.rxnArrows.values());
      const rxnArrowMode: RxnArrowMode = arrayOfArrows[0].mode;
      if (
        ![RxnArrowMode.OpenAngle, RxnArrowMode.Retrosynthetic].includes(
          rxnArrowMode,
        )
      ) {
        warnings.push(
          i18n.t('saveWarnings.arrowReplaced', {
            format: formatName,
            arrowMode: rxnArrowMode,
          }),
        );
      }
    }

    // TODO: find better solution for case when Arrows > 1
    if (rxnArrowsSize > 1) {
      warnings.push(i18n.t('saveWarnings.arrowsLost', { format: formatName }));
    }
  }

  if (
    (
      [
        'inChI',
        'inChIAuxInfo',
        'inChIKey',
        'smiles',
        'smilesExt',
      ] as SupportedFormat[]
    ).includes(format)
  ) {
    if (struct.rgroups.size !== 0)
      warnings.push(
        i18n.t('saveWarnings.noRgroupFragments', { format: formatName }),
      );

    struct = struct.clone(); // need this: .getScaffold()
    const isRg = struct.atoms.find((_ind, atom) => atom.label === 'R#');
    if (isRg !== null)
      warnings.push(
        i18n.t('saveWarnings.noRgroupMembers', { format: formatName }),
      );

    const isSg = struct.sgroups.find(
      (_ind, sg) =>
        sg.type !== 'MUL' && !/^INDIGO_.+_DESC$/i.test(sg.data.fieldName),
    );
    if (isSg !== null)
      warnings.push(i18n.t('saveWarnings.noSgroups', { format: formatName }));
  }

  if (
    (
      [
        'smiles',
        'smilesExt',
        'smarts',
        'inChI',
        'inChIAuxInfo',
        'inChIKey',
        'cml',
      ] as SupportedFormat[]
    ).includes(format)
  ) {
    const isVal = struct.atoms.find((_ind, atom) => atom.explicitValence >= 0);
    if (isVal !== null)
      warnings.push(
        i18n.t('saveWarnings.valenceUnsupported', { format: formatName }),
      );
  }

  if (
    (['mol', 'rxn'] as SupportedFormat[]).includes(format) &&
    Array.from(struct.frags.values()).some((fr) => {
      if (fr?.enhancedStereoFlag) {
        return fr.enhancedStereoFlag !== StereoFlag.Abs;
      }
      return false;
    })
  ) {
    warnings.push(i18n.t('saveWarnings.enhancedStereoLost'));
  }

  if (
    (
      [
        'inChI',
        'inChIAuxInfo',
        'inChIKey',
        'smiles',
        'smilesExt',
      ] as SupportedFormat[]
    ).includes(format)
  ) {
    if (struct.functionalGroups.size !== 0)
      warnings.push(
        i18n.t('saveWarnings.noFunctionalGroups', { format: formatName }),
      );
  }

  if ((['cml'] as SupportedFormat[]).includes(format)) {
    if (struct.functionalGroups.size !== 0)
      warnings.push(
        i18n.t('saveWarnings.cmlFunctionalGroupsLost', {
          format: formatName,
        }),
      );
  }

  if (warnings.length !== 0) return warnings.join('\n');

  return null;
}
