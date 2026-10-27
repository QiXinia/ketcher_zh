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
  IsotopicAbundance,
  RxnArrowMode,
  StereoFlag,
  exceedsMolfileV2000Limit,
  getPropertiesByFormat,
} from 'ketcher-core';

export function couldBeSaved(
  struct: Struct,
  format: SupportedFormat,
): string | null {
  const warnings: Array<string> = [];
  const formatName: string = getPropertiesByFormat(format).name;

  if (
    [
      'mol',
      'molV3000',
      'molAuto',
      'rxn',
      'rxnV3000',
      'sdf',
      'sdfV3000',
    ].includes(format) &&
    Array.from(struct.bonds.values()).some(
      (bond) => bond.type === Bond.PATTERN.TYPE.QUADRUPLE,
    )
  ) {
    warnings.push(
      `The ${formatName} format does not support quadruple bonds. The bond will be downgraded when saved.`,
    );
  }

  if (
    format !== 'ket' &&
    Array.from(struct.atoms.values()).some(
      (atom) =>
        atom.isotopicAbundance !== IsotopicAbundance.Unspecified,
    )
  ) {
    warnings.push(
      `The ${formatName} format does not preserve isotopic abundance query properties.`,
    );
  }

  if (
    format !== 'ket' &&
    Array.from(struct.atoms.values()).some((atom) => atom.abnormalValence)
  ) {
    warnings.push(
      `The ${formatName} format does not preserve ChemDraw abnormal-valence permissions.`,
    );
  }

  if (
    format !== 'ket' &&
    Array.from(struct.atoms.values()).some(
      (atom) => atom.queryProperties.substitutionQuery,
    )
  ) {
    warnings.push(
      `The ${formatName} format does not preserve ChemDraw Substituents mode and count.`,
    );
  }

  if (
    format !== 'ket' &&
    Array.from(struct.atoms.values()).some(
      (atom) => atom.implicitHCount !== null,
    )
  ) {
    warnings.push(
      `The ${formatName} format does not preserve ChemDraw implicit-hydrogen query constraints.`,
    );
  }

  if (
    format !== 'ket' &&
    Array.from(struct.atoms.values()).some(
      (atom) => atom.queryProperties.unsaturation,
    )
  ) {
    warnings.push(
      `The ${formatName} format does not preserve ChemDraw Unsaturation query predicates.`,
    );
  }

  if (
    format !== 'ket' &&
    Array.from(struct.atoms.values()).some(
      (atom) => atom.queryProperties.translation,
    )
  ) {
    warnings.push(
      `The ${formatName} format does not preserve ChemDraw Translation query predicates.`,
    );
  }

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
      warnings.push(
        `Structure contains query properties of atoms and bonds that are not supported in the SMARTS. Query properties will not be reflected in the file saved.`,
      );
    }
    if (arrayOfAtoms.some((atom) => atom.queryProperties.substitutionQuery)) {
      warnings.push(
        `ChemDraw Substituents modes may differ in SMARTS matching semantics.`,
      );
    }
    if (arrayOfAtoms.some((atom) => atom.queryProperties.unsaturation)) {
      warnings.push(
        `ChemDraw Unsaturation predicates are KET extensions and may differ in SMARTS matching semantics.`,
      );
    }
    if (arrayOfAtoms.some((atom) => atom.queryProperties.translation)) {
      warnings.push(
        `ChemDraw Translation predicates are KET extensions and may differ in SMARTS matching semantics.`,
      );
    }
  }

  if (format === 'smiles') {
    const arrayOfAtoms: Array<any> = Array.from(struct.atoms.values());
    const hasGenerics = arrayOfAtoms.some((atom) => atom.pseudo);
    if (hasGenerics) {
      warnings.push(
        `Structure contains generic atoms. They will be saved as any atom (*).`,
      );
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
          `The ${formatName} format does not support drawn elements: the reaction ${rxnArrowMode} arrow will be replaced with the reaction arrow`,
        );
      }
    }

    // TODO: find better solution for case when Arrows > 1
    if (rxnArrowsSize > 1) {
      warnings.push(
        `The ${formatName} format does not support drawn elements: reaction arrows will be lost.`,
      );
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
        `In ${formatName} the structure will be saved without R-group fragments`,
      );

    struct = struct.clone(); // need this: .getScaffold()
    const isRg = struct.atoms.find((_ind, atom) => atom.label === 'R#');
    if (isRg !== null)
      warnings.push(
        `In ${formatName} the structure will be saved without R-group members`,
      );

    const isSg = struct.sgroups.find(
      (_ind, sg) =>
        sg.type !== 'MUL' && !/^INDIGO_.+_DESC$/i.test(sg.data.fieldName),
    );
    if (isSg !== null)
      warnings.push(
        `In ${formatName} the structure will be saved without S-groups`,
      );
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
      warnings.push(`In ${formatName} valence is not supported`);
  }

  if (
    (['mol'] as SupportedFormat[]).includes(format) &&
    exceedsMolfileV2000Limit(struct)
  ) {
    warnings.push(
      'The structure exceeds the MDL Molfile V2000 limit (999 atoms/bonds) and will be saved in V3000 format.',
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
    warnings.push(
      `Structure contains enhanced stereochemistry features. Information will be partly lost.`,
    );
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
        `In ${formatName} the structure will be saved without functional groups.`,
      );
  }

  if ((['cml'] as SupportedFormat[]).includes(format)) {
    if (struct.functionalGroups.size !== 0)
      warnings.push(
        `Structure contains functional groups. In ${formatName} information will be partly lost.`,
      );
  }

  if (warnings.length !== 0) return warnings.join('\n');

  return null;
}
