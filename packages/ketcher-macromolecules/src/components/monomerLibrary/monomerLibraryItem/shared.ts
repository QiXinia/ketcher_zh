import {
  CoreEditor,
  IRnaPreset,
  libraryItemHasR1AttachmentPoint,
  MonomerOrAmbiguousType,
} from 'ketcher-core';
import { i18n } from 'ketcher-react';

export const getAutochainErrorMessage = (
  editor: CoreEditor,
  libraryItem: MonomerOrAmbiguousType | IRnaPreset,
): string => {
  const { selectedMonomersWithFreeR2, selectedMonomers } =
    editor.getDataForAutochain();

  if (selectedMonomers.length > 0 && selectedMonomersWithFreeR2.length !== 1) {
    return i18n.t('monomerLibrary.selectMonomerWithR2');
  }

  if (
    selectedMonomersWithFreeR2.length === 1 &&
    !libraryItemHasR1AttachmentPoint(libraryItem)
  ) {
    return i18n.t('monomerLibrary.cannotAddLacksR1');
  }

  return '';
};

export const cardMouseOverHandler = (
  editor: CoreEditor,
  libraryItem: MonomerOrAmbiguousType | IRnaPreset,
  setAutochainErrorMessage: (message: string) => void,
) => {
  const errorMessage = getAutochainErrorMessage(editor, libraryItem);
  setAutochainErrorMessage(errorMessage);
};
