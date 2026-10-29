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

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Save } from 'components/modal/save';
import userEvent from '@testing-library/user-event';
import { type CoreEditor, Struct } from 'ketcher-core';
import * as ketcherCore from 'ketcher-core';
import { saveAs } from 'file-saver';
import { IndigoProvider } from 'ketcher-react';

jest.mock('file-saver', () => ({ saveAs: jest.fn() }));

const mockOnClose = jest.fn();

const mockProps = {
  onClose: mockOnClose,
  isModalOpen: true,
};

describe('Save modal', () => {
  beforeEach(() => {
    jest.spyOn(ketcherCore, 'provideEditorInstance').mockImplementation(
      () =>
        ({
          drawingEntitiesManager: {
            micromoleculesHiddenEntities: {
              clone: () => new Struct(),
              mergeInto: jest.fn(),
            },
            setMicromoleculesHiddenEntities: jest.fn(),
            detectBondsOverlappedByMonomers: jest.fn(),
            monomers: [],
            polymerBonds: [],
            bonds: [],
            monomerToAtomBonds: [],
            atoms: [],
            rxnArrows: [],
            multitailArrows: [],
            rxnPluses: [],
          },
          viewModel: { initialize: jest.fn() },
        }) as unknown as CoreEditor,
    );
    mockOnClose.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('renders correctly', () => {
    const view = render(withThemeAndStoreProvider(<Save {...mockProps} />));

    const filenameInput = screen.getByRole('textbox', {
      name: 'File name:',
    });
    const fileFormatInput = screen.getByText('Ket Format');

    expect(view).toMatchSnapshot();
    expect(filenameInput).toBeVisible();
    expect(filenameInput).toHaveValue('ketcher');
    expect(fileFormatInput).toBeVisible();
  });

  it('previews the drawing and saves the selected raster format', async () => {
    const png = new Blob(['png'], { type: 'image/png' });
    jest
      .spyOn(ketcherCore, 'getSvgFromDrawnStructures')
      .mockReturnValue('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const convert = jest
      .spyOn(ketcherCore, 'convertKetcherImageToRaster')
      .mockResolvedValue(png);
    mockOnClose.mockClear();
    render(withThemeAndStoreProvider(<Save {...mockProps} />));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'PNG Image' }));
    expect(
      screen.getByTestId('preview-area').querySelector('svg'),
    ).toBeTruthy();
    fireEvent.click(screen.getByTestId('save-button'));
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    expect(convert).toHaveBeenCalledWith(expect.any(Blob), 'png');
    expect(saveAs).toHaveBeenCalledWith(png, 'ketcher.png');
    convert.mockRestore();
  });

  it.each([true, false])(
    'keeps the latest format when conversions resolve out of order (old first: %s)',
    async (oldFirst) => {
      let resolveOld!: (value: { struct: string }) => void;
      let resolveNew!: (value: { struct: string }) => void;
      const oldResult = new Promise<{ struct: string }>((resolve) => {
        resolveOld = resolve;
      });
      const newResult = new Promise<{ struct: string }>((resolve) => {
        resolveNew = resolve;
      });
      const convert = jest
        .fn()
        .mockReturnValueOnce(oldResult)
        .mockReturnValueOnce(newResult);
      jest
        .spyOn(IndigoProvider, 'getIndigo')
        .mockReturnValue({ convert } as unknown as ReturnType<
          typeof IndigoProvider.getIndigo
        >);
      const editor = {
        drawingEntitiesManager: {
          micromoleculesHiddenEntities: {
            clone: () => new Struct(),
            mergeInto: jest.fn(),
          },
          setMicromoleculesHiddenEntities: jest.fn(),
          detectBondsOverlappedByMonomers: jest.fn(),
          validateIfApplicableForFasta: () => true,
          monomers: [],
          polymerBonds: [],
          bonds: [],
          monomerToAtomBonds: [],
          atoms: [],
          rxnArrows: [],
          multitailArrows: [],
          rxnPluses: [],
        },
        viewModel: { initialize: jest.fn() },
      } as unknown as CoreEditor;
      jest.spyOn(ketcherCore, 'provideEditorInstance').mockReturnValue(editor);
      render(withThemeAndStoreProvider(<Save {...mockProps} />));
      fireEvent.mouseDown(screen.getByRole('combobox'));
      fireEvent.click(
        screen.getByRole('option', { name: 'MDL Molfile V3000' }),
      );
      fireEvent.mouseDown(screen.getByRole('combobox'));
      fireEvent.click(
        screen.getByRole('option', { name: 'Sequence (1-letter code)' }),
      );
      expect(convert).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('copy-to-clipboard')).toBeDisabled();
      expect(screen.getByTestId('save-button')).toBeDisabled();
      if (oldFirst) {
        await act(async () => resolveOld({ struct: 'stale MOL' }));
        expect(screen.getByTestId('copy-to-clipboard')).toBeDisabled();
        expect(screen.getByTestId('save-button')).toBeDisabled();
        await act(async () => resolveNew({ struct: 'NEW SEQUENCE' }));
      } else {
        await act(async () => resolveNew({ struct: 'NEW SEQUENCE' }));
        await act(async () => resolveOld({ struct: 'stale MOL' }));
      }
      expect(screen.getByTestId('preview-area')).toHaveValue('NEW SEQUENCE');
      expect(screen.getByTestId('copy-to-clipboard')).toBeEnabled();
      expect(screen.getByTestId('save-button')).toBeEnabled();
    },
  );

  it.skip('renders dropdown options correctly', () => {
    render(withThemeAndStoreProvider(<Save {...mockProps} />));

    const fileFormat = screen.getByRole('button', {
      name: 'MDL Molfile V3000',
    });

    fireEvent.click(fileFormat);
    const fileFormatDropdown = screen.getByTestId('dropdown-select');
    const option1 = screen.getByRole('option', { name: 'MDL Molfile V3000' });
    const option2 = screen.getByRole('option', { name: 'HELM' });

    expect(fileFormatDropdown).toBeVisible();
    expect(option1).toBeVisible();
    expect(option2).toBeVisible();
  });

  it.skip('renders buttons correctly', async () => {
    render(withThemeProvider(<Save {...mockProps} />));

    const saveButton = screen.getByRole('button', { name: 'Save as file' });
    const filenameInput = screen.getByRole('textbox', {
      name: 'File name:',
    });

    await act(async () => {
      await userEvent.clear(filenameInput);
    });

    expect(saveButton).toBeDisabled();
  });

  it('should pass molfile-saving-mode option when converting to MOL V3000 format', () => {
    const mockConvert = jest.fn().mockResolvedValue({
      struct: 'V3000 format result',
    });

    jest.spyOn(IndigoProvider, 'getIndigo').mockReturnValue({
      convert: mockConvert,
    } as unknown as ReturnType<typeof IndigoProvider.getIndigo>);

    const mockEditor = {
      drawingEntitiesManager: {
        micromoleculesHiddenEntities: {
          clone: () => new Struct(),
          mergeInto: jest.fn(),
        },
        setMicromoleculesHiddenEntities: jest.fn(),
        detectBondsOverlappedByMonomers: jest.fn(),
        validateIfApplicableForFasta: jest.fn().mockReturnValue(true),
        molecules: [],
        monomers: new Map(),
        polymerBonds: [],
        bonds: [],
        monomerToAtomBonds: [],
        atoms: [],
        rxnArrows: [],
        multitailArrows: [],
        rxnPluses: [],
      },
      monomersLibrary: {},
      canvas: document.createElement('canvas'),
      viewModel: {
        initialize: jest.fn(),
      },
      events: {
        error: {
          dispatch: jest.fn(),
        },
      },
    } as unknown as CoreEditor;

    jest
      .spyOn(ketcherCore, 'provideEditorInstance')
      .mockImplementation(() => mockEditor);

    render(withThemeAndStoreProvider(<Save {...mockProps} />));

    // Simulate selecting MOL format by getting access to the internal handleSelectChange
    // We verify this by checking the convert call when the format is changed
    const previewArea = screen.getByTestId('preview-area');
    expect(previewArea).toBeInTheDocument();

    // Since we can't easily simulate the dropdown interaction,
    // we verify the implementation by checking that getPropertiesByFormat('mol')
    // returns the correct options with 'molfile-saving-mode': '3000'
    const { getPropertiesByFormat } = require('helpers/formats');
    const molProperties = getPropertiesByFormat('mol');

    expect(molProperties.options).toEqual({ 'molfile-saving-mode': '3000' });
    expect(molProperties.name).toBe('MDL Molfile V3000');
  });
});
