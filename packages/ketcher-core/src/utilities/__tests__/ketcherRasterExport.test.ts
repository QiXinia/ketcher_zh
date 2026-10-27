import {
  convertKetcherImageToRaster,
  encodeKetcherRasterPixels,
  isKetcherRasterFormat,
} from '../ketcherRasterExport';

const pixels = new Uint8Array([
  255, 0, 0, 255, 0, 0, 0, 0,
  0, 0, 255, 255, 0, 255, 0, 255,
]);

describe('raster image export', () => {
  it('encodes 24-bit BMP with padded rows, bottom-up colors, and a white background', () => {
    const bytes = encodeKetcherRasterPixels(pixels, 2, 2, 'bmp');
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.slice(0, 2))).toBe('BM');
    expect(view.getUint32(2, true)).toBe(bytes.length);
    expect(view.getUint16(28, true)).toBe(24);
    expect([...bytes.slice(54)]).toEqual([
      255, 0, 0, 0, 255, 0, 0, 0,
      0, 0, 255, 255, 255, 255, 0, 0,
    ]);
  });

  it('writes a baseline RGB TIFF and a complete GIF', () => {
    const tiff = encodeKetcherRasterPixels(pixels, 2, 2, 'tiff');
    const view = new DataView(tiff.buffer);
    expect([...tiff.slice(0, 4)]).toEqual([73, 73, 42, 0]);
    const count = view.getUint16(8, true);
    const tags = new Map(Array.from({ length: count }, (_, index) => {
      const offset = 10 + index * 12;
      return [view.getUint16(offset, true), view.getUint32(offset + 8, true)];
    }));
    expect(tags.get(256)).toBe(2);
    expect(tags.get(257)).toBe(2);
    expect([...tiff.slice(tags.get(273))]).toEqual([
      255, 0, 0, 255, 255, 255, 0, 0, 255, 0, 255, 0,
    ]);
    const gif = encodeKetcherRasterPixels(pixels, 2, 2, 'gif');
    expect(String.fromCharCode(...gif.slice(0, 6))).toBe('GIF89a');
    expect(gif[gif.length - 1]).toBe(0x3b);
  });

  it('rejects invalid buffers and unknown formats', () => {
    expect(() => encodeKetcherRasterPixels(pixels, 3, 2, 'bmp')).toThrow();
    expect(() => encodeKetcherRasterPixels(pixels, 0, 2, 'gif')).toThrow();
    expect(isKetcherRasterFormat('jpeg')).toBe(true);
    expect(isKetcherRasterFormat('svg')).toBe(false);
  });

  it('rejects a browser PNG fallback when JPEG was requested and frees its URL', async () => {
    const originalImage = global.Image;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const revoke = jest.fn();
    class StubImage {
      naturalWidth = 2;
      naturalHeight = 2;
      onload?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    }
    global.Image = StubImage as unknown as typeof Image;
    URL.createObjectURL = jest.fn(() => 'blob:test');
    URL.revokeObjectURL = revoke;
    const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ fillRect: jest.fn(), drawImage: jest.fn() } as any);
    const toBlob = jest.spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
    try {
      await expect(convertKetcherImageToRaster(new Blob(['png']), 'jpeg')).rejects.toThrow('JPEG');
      expect(revoke).toHaveBeenCalledWith('blob:test');
    } finally {
      getContext.mockRestore();
      toBlob.mockRestore();
      global.Image = originalImage;
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
