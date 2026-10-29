/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import { ElementWithDropdown } from './ElementWithDropdown';
import { TopToolbarIconButton } from './TopToolbarIconButton';
import i18n from '../../../../../i18n';
import styled from '@emotion/styled';

const FormatButton = styled('button')`
  min-width: 56px;
  min-height: 28px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 11px;
  &:hover {
    background: var(--ketcher-surface-hover, #e9eef1);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const CopyFormatButton = ({
  isHidden,
  title,
  label,
  handler,
  disabled,
  testId,
}) =>
  isHidden ? null : (
    <FormatButton
      type="button"
      title={title}
      aria-label={title}
      onClick={handler}
      disabled={disabled}
      data-testid={testId}
    >
      {label}
    </FormatButton>
  );

interface ClipboardControlsProps {
  onCopy: () => void;
  onCopyMol: () => void;
  onCopyKet: () => void;
  onCopySmiles: () => void;
  onCopyInchi: () => void;
  onCopyInchiKey: () => void;
  onCopyCdxml: () => void;
  onCopyImage: () => void;
  onPaste: () => void;
  onCut: () => void;
  disabledButtons: string[];
  hiddenButtons: string[];
  shortcuts: { [key in string]: string };
}

export const ClipboardControls = ({
  onCopy,
  onCopyMol,
  onCopyKet,
  onCopySmiles,
  onCopyInchi,
  onCopyInchiKey,
  onCopyCdxml,
  onCopyImage,
  onPaste,
  onCut,
  shortcuts,
  disabledButtons,
  hiddenButtons,
}: ClipboardControlsProps) => {
  const copyButtons = [
    {
      name: 'copy',
      title: i18n.t('topToolbar.copy'),
      handler: onCopy,
      testId: 'copy-button',
    },
    {
      name: 'copy-mol',
      title: i18n.t('topToolbar.copyAsMOL'),
      handler: onCopyMol,
      testId: 'copy-mol-button',
    },
    {
      name: 'copy-ket',
      title: i18n.t('topToolbar.copyAsKET'),
      handler: onCopyKet,
      testId: 'copy-ket-button',
    },
    {
      name: 'copy-image',
      title: i18n.t('topToolbar.copyImage'),
      handler: onCopyImage,
      testId: 'copy-image-button',
    },
    {
      name: 'copy-smiles',
      title: i18n.t('action.copyAsSMILES'),
      label: 'SMILES',
      handler: onCopySmiles,
      testId: 'copy-smiles-button',
    },
    {
      name: 'copy-inchi',
      title: i18n.t('action.copyAsInChI'),
      label: 'InChI',
      handler: onCopyInchi,
      testId: 'copy-inchi-button',
    },
    {
      name: 'copy-inchikey',
      title: i18n.t('action.copyAsInChIKey'),
      label: 'InChIKey',
      handler: onCopyInchiKey,
      testId: 'copy-inchikey-button',
    },
    {
      name: 'copy-cdxml',
      title: i18n.t('action.copyAsCDXML'),
      label: 'CDXML',
      handler: onCopyCdxml,
      testId: 'copy-cdxml-button',
    },
  ];

  const getButtonElement = (button) =>
    button.label ? (
      <CopyFormatButton
        title={button.title}
        label={button.label}
        handler={button.handler}
        disabled={disabledButtons.includes(button.name)}
        isHidden={hiddenButtons.includes(button.name)}
        key={button.name}
        testId={button.testId}
      />
    ) : (
      <TopToolbarIconButton
        title={button.title}
        onClick={button.handler}
        iconName={button.name}
        shortcut={shortcuts[button.name]}
        disabled={disabledButtons.includes(button.name)}
        isHidden={hiddenButtons.includes(button.name)}
        key={button.name}
        testId={button.testId}
      />
    );

  const firstButtonObj = copyButtons.find(
    (button) => !hiddenButtons.includes(button.name),
  );
  const collapsibleElements = copyButtons
    .filter((button) => button !== firstButtonObj)
    .map((button) => getButtonElement(button));

  return (
    <>
      {!hiddenButtons.includes('copies') && (
        <ElementWithDropdown
          topElement={
            firstButtonObj ? getButtonElement(firstButtonObj) : undefined
          }
          dropDownElements={collapsibleElements}
        />
      )}
      <TopToolbarIconButton
        title={i18n.t('topToolbar.paste')}
        testId="paste-button"
        onClick={onPaste}
        iconName="paste"
        shortcut={shortcuts.paste}
        disabled={disabledButtons.includes('paste')}
        isHidden={hiddenButtons.includes('paste')}
      />
      <TopToolbarIconButton
        title={i18n.t('topToolbar.cut')}
        testId="cut-button"
        onClick={onCut}
        iconName="cut"
        shortcut={shortcuts.cut}
        disabled={disabledButtons.includes('cut')}
        isHidden={hiddenButtons.includes('cut')}
      />
    </>
  );
};
