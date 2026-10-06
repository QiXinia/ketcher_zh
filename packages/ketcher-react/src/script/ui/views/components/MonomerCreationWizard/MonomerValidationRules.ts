import { KetMonomerClass, AttachmentPointName, AtomLabel } from 'ketcher-core';

export type LeavingGroupRequirement = {
  attachmentPoint: AttachmentPointName;
  expectedLeavingGroup: AtomLabel;
};

export type MonomerValidationRule = {
  monomerType: KetMonomerClass;
  requirements: LeavingGroupRequirement[];
  warningMessage: string;
};

export const MONOMER_VALIDATION_RULES: MonomerValidationRule[] = [
  {
    monomerType: KetMonomerClass.AminoAcid,
    requirements: [
      {
        attachmentPoint: AttachmentPointName.R1,
        expectedLeavingGroup: AtomLabel.H,
      },
      {
        attachmentPoint: AttachmentPointName.R2,
        expectedLeavingGroup: AtomLabel.O,
      },
    ],
    warningMessage: 'monomerWizard.validation.aminoAcid',
  },
  {
    monomerType: KetMonomerClass.Sugar,
    requirements: [
      {
        attachmentPoint: AttachmentPointName.R1,
        expectedLeavingGroup: AtomLabel.H,
      },
      {
        attachmentPoint: AttachmentPointName.R2,
        expectedLeavingGroup: AtomLabel.H,
      },
      {
        attachmentPoint: AttachmentPointName.R3,
        expectedLeavingGroup: AtomLabel.O,
      },
    ],
    warningMessage: 'monomerWizard.validation.sugar',
  },
  {
    monomerType: KetMonomerClass.Base,
    requirements: [
      {
        attachmentPoint: AttachmentPointName.R1,
        expectedLeavingGroup: AtomLabel.H,
      },
    ],
    warningMessage: 'monomerWizard.validation.base',
  },
  {
    monomerType: KetMonomerClass.Phosphate,
    requirements: [
      {
        attachmentPoint: AttachmentPointName.R1,
        expectedLeavingGroup: AtomLabel.O,
      },
      {
        attachmentPoint: AttachmentPointName.R2,
        expectedLeavingGroup: AtomLabel.O,
      },
    ],
    warningMessage: 'monomerWizard.validation.phosphate',
  },
  {
    monomerType: KetMonomerClass.RNA,
    requirements: [
      {
        attachmentPoint: AttachmentPointName.R1,
        expectedLeavingGroup: AtomLabel.H,
      },
      {
        attachmentPoint: AttachmentPointName.R2,
        expectedLeavingGroup: AtomLabel.O,
      },
    ],
    warningMessage: 'monomerWizard.validation.nucleotide',
  },
];

export const getValidationRuleForMonomerType = (
  monomerType: KetMonomerClass | 'rnaPreset',
): MonomerValidationRule | undefined => {
  return MONOMER_VALIDATION_RULES.find(
    (rule) => rule.monomerType === monomerType,
  );
};
