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
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Save } from 'components/modal/save';
import userEvent from '@testing-library/user-event';
import { Struct } from 'ketcher-core';
import * as ketcherCore from 'ketcher-core';
import { saveAs } from 'file-saver';

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
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

  it.skip('renders buttons correctly', () => {
    render(withThemeProvider(<Save {...mockProps} />));

    const saveButton = screen.getByRole('button', { name: 'Save as file' });
    const filenameInput = screen.getByRole('textbox', {
      name: 'File name:',
    });

    // eslint-disable-next-line testing-library/no-unnecessary-act
    act(() => {
      userEvent.clear(filenameInput);
    });

    expect(saveButton).toBeDisabled();
  });
});
