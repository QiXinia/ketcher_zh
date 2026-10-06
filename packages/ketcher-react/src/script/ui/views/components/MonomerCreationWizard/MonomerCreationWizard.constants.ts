import { KetMonomerClass } from 'ketcher-core';

import type {
  MonomerTypeSelectItem,
  WizardNotificationMessageMap,
  WizardNotificationTypeMap,
} from './MonomerCreationWizard.types';

export const MonomerTypeSelectConfig: MonomerTypeSelectItem[] = [
  {
    value: KetMonomerClass.AminoAcid,
    label: 'monomerWizard.typeLabels.aminoAcid',
    iconName: 'peptide',
  },
  {
    value: KetMonomerClass.Sugar,
    label: 'monomerWizard.typeLabels.sugar',
    iconName: 'sugar',
  },
  {
    value: KetMonomerClass.Base,
    label: 'monomerWizard.typeLabels.base',
    iconName: 'base',
  },
  {
    value: KetMonomerClass.Phosphate,
    label: 'monomerWizard.typeLabels.phosphate',
    iconName: 'phosphate',
  },
  {
    value: KetMonomerClass.RNA,
    label: 'monomerWizard.typeLabels.nucleotideMonomer',
    iconName: 'nucleotide',
  },
  {
    value: 'rnaPreset',
    label: 'monomerWizard.typeLabels.nucleotidePreset',
    iconName: 'preset',
  },
  {
    value: KetMonomerClass.CHEM,
    label: 'monomerWizard.typeLabels.chem',
    iconName: 'chem',
  },
];

export const MAX_MODIFICATION_TYPES = 5;

export const NotificationMessages: WizardNotificationMessageMap = {
  defaultAttachmentPoints:
    'monomerWizard.notifications.defaultAttachmentPoints',
  emptyMandatoryFields: 'monomerWizard.notifications.emptyMandatoryFields',
  invalidSymbol: 'monomerWizard.notifications.invalidSymbol',
  symbolExists: 'monomerWizard.notifications.symbolExists',
  editingIsNotAllowed: 'monomerWizard.notifications.editingIsNotAllowed',
  noAttachmentPoints: 'monomerWizard.notifications.noAttachmentPoints',
  incorrectAttachmentPointsOrder:
    'monomerWizard.notifications.incorrectAttachmentPointsOrder',
  attachmentPointsNotUnique:
    'monomerWizard.notifications.attachmentPointsNotUnique',
  creationSuccessful: 'monomerWizard.notifications.creationSuccessful',
  creationRNASuccessful: 'monomerWizard.notifications.creationRNASuccessful',
  incontinuousStructure: 'monomerWizard.notifications.incontinuousStructure',
  notUniqueModificationTypes:
    'monomerWizard.notifications.notUniqueModificationTypes',
  modificationTypeExists: 'monomerWizard.notifications.modificationTypeExists',
  notMinimalViableStructure:
    'monomerWizard.notifications.notMinimalViableStructure',
  impureStructure: 'monomerWizard.notifications.impureStructure',
  invalidHELMAlias: 'monomerWizard.notifications.invalidHELMAlias',
  notUniqueHELMAlias: 'monomerWizard.notifications.notUniqueHELMAlias',
  invalidBILNAlias: 'monomerWizard.notifications.invalidBILNAlias',
  notUniqueBILNAlias: 'monomerWizard.notifications.notUniqueBILNAlias',
  invalidRnaPresetStructure:
    'monomerWizard.notifications.invalidRnaPresetStructure',
  rnaPresetAtomsOutsideComponents:
    'monomerWizard.notifications.rnaPresetAtomsOutsideComponents',
  rnaPresetAtomsInMultipleComponents:
    'monomerWizard.notifications.rnaPresetAtomsInMultipleComponents',
  rnaPresetMissingComponents:
    'monomerWizard.notifications.rnaPresetMissingComponents',
  rnaPresetInvalidSugarConnectionBonds:
    'monomerWizard.notifications.rnaPresetInvalidSugarConnectionBonds',
  rnaPresetUnexpectedBasePhosphateBond:
    'monomerWizard.notifications.rnaPresetUnexpectedBasePhosphateBond',
  rnaPresetInvalidSugarBaseConnectionAttachmentPoints:
    'monomerWizard.notifications.rnaPresetInvalidSugarBaseConnectionAttachmentPoints',
  rnaPresetInvalidSugarPhosphateConnectionAttachmentPoints:
    'monomerWizard.notifications.rnaPresetInvalidSugarPhosphateConnectionAttachmentPoints',
  notUniquePresetCode: 'monomerWizard.notifications.notUniquePresetCode',
  invalidPresetCode: 'monomerWizard.notifications.invalidPresetCode',
  invalidName: 'monomerWizard.notifications.invalidName',
  invalidPhosphatePositionAttachmentPoints:
    'monomerWizard.notifications.invalidPhosphatePositionAttachmentPoints',
  phosphatePositionNotSelected:
    'monomerWizard.notifications.phosphatePositionNotSelected',
  editAllPresetWarning: 'monomerWizard.notifications.editAllPresetWarning',
  editAllPresetError: 'monomerWizard.notifications.editAllPresetError',
};

export const NotificationTypes: WizardNotificationTypeMap = {
  defaultAttachmentPoints: 'info',
  emptyMandatoryFields: 'error',
  invalidSymbol: 'error',
  symbolExists: 'error',
  editingIsNotAllowed: 'error',
  noAttachmentPoints: 'error',
  incorrectAttachmentPointsOrder: 'error',
  attachmentPointsNotUnique: 'error',
  creationSuccessful: 'info',
  creationRNASuccessful: 'info',
  incontinuousStructure: 'error',
  notUniqueModificationTypes: 'error',
  modificationTypeExists: 'error',
  notMinimalViableStructure: 'error',
  impureStructure: 'error',
  invalidHELMAlias: 'error',
  notUniqueHELMAlias: 'error',
  invalidBILNAlias: 'error',
  notUniqueBILNAlias: 'error',
  invalidRnaPresetStructure: 'error',
  rnaPresetAtomsOutsideComponents: 'error',
  rnaPresetAtomsInMultipleComponents: 'error',
  rnaPresetMissingComponents: 'error',
  rnaPresetInvalidSugarConnectionBonds: 'error',
  rnaPresetUnexpectedBasePhosphateBond: 'error',
  rnaPresetInvalidSugarBaseConnectionAttachmentPoints: 'error',
  rnaPresetInvalidSugarPhosphateConnectionAttachmentPoints: 'error',
  notUniquePresetCode: 'error',
  invalidPresetCode: 'error',
  invalidName: 'error',
  invalidPhosphatePositionAttachmentPoints: 'error',
  phosphatePositionNotSelected: 'error',
  editAllPresetWarning: 'warning',
  editAllPresetError: 'error',
};

export const MonomerCreationExternalNotificationAction =
  'MonomerCreationExternalNotification';

export const MonomerCreationMarkAsComponentAction =
  'MonomerCreationMarkAsComponent';

export type RnaPresetComponentType = 'base' | 'sugar' | 'phosphate';
