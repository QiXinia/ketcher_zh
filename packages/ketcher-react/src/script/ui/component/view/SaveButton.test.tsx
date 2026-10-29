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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { convertKetcherImageToRaster, ketcherProvider } from 'ketcher-core';
import { saveAs } from 'file-saver';
import { SaveButton } from './savebutton';

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    useAppContext: () => ({
      ketcherId: '',
    }),
  };
});

jest.mock('ketcher-core', () => ({
  ...jest.requireActual('ketcher-core'),
  convertKetcherImageToRaster: jest.fn(),
  ketcherProvider: { getKetcher: jest.fn() },
}));
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));

describe('SaveButton', () => {
  const defaultProps = {
    filename: 'test.mol',
    data: '',
  };

  describe('Disabled state', () => {
    it('Should be enabled by default', () => {
      render(<SaveButton {...defaultProps}>Save</SaveButton>);
      const btn = screen.getByRole('button');
      expect(btn).toBeEnabled();
    });

    it('Should be disabled', () => {
      render(
        <SaveButton {...defaultProps} disabled>
          Save
        </SaveButton>,
      );
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  it('renders a PNG first, then saves the requested bitmap with its real extension', async () => {
    const png = new Blob(['png'], { type: 'image/png' });
    const bitmap = new Blob(['bitmap'], { type: 'image/bmp' });
    const generateImage = jest.fn().mockResolvedValue(png);
    (ketcherProvider.getKetcher as jest.Mock).mockReturnValue({
      generateImage,
    });
    (convertKetcherImageToRaster as jest.Mock).mockResolvedValue(bitmap);
    const onSave = jest.fn();
    render(
      <SaveButton
        filename="structure"
        data="ket"
        mode="saveImage"
        options={{ outputFormat: 'png' }}
        rasterFormat="bmp"
        onSave={onSave}
      >
        Save
      </SaveButton>,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(generateImage).toHaveBeenCalledWith('ket', { outputFormat: 'png' });
    expect(convertKetcherImageToRaster).toHaveBeenCalledWith(png, 'bmp');
    expect(saveAs).toHaveBeenCalledWith(bitmap, 'structure.bmp');
  });

  it('Should get file data only after the button is clicked', () => {
    const getData = jest.fn(() => '');
    render(
      <SaveButton filename="test.sdf" getData={getData}>
        Save
      </SaveButton>,
    );

    expect(getData).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(getData).toHaveBeenCalledTimes(1);
  });
});
