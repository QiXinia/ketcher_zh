import { Box2Abs, Vec2 } from 'ketcher-core';
import Editor from './Editor';

describe('micromolecule fit', () => {
  it('centers the rendered content including the drawing offset without moving atoms', () => {
    let viewBox = { minX: 0, minY: 0, width: 100, height: 100 };
    const dispatch = jest.fn();
    const editor = {
      struct: () => ({ isBlank: () => false }),
      render: {
        update: jest.fn(),
        ctab: { getVBoxObj: () => new Box2Abs(10, 20, 12, 21) },
        options: {
          microModeScale: 20,
          macroModeScale: 1,
          offset: new Vec2(10, 5),
        },
        sz: new Vec2(100, 100),
        setViewBox: (f: (value: typeof viewBox) => typeof viewBox) => {
          viewBox = f(viewBox);
        },
      },
      zoom: (scale: number) => {
        viewBox.width = 100 / scale;
        viewBox.height = 100 / scale;
      },
      event: { zoomChanged: { dispatch } },
    };
    expect(
      Editor.prototype.fitCanvasToContent.call(editor as unknown as Editor),
    ).toBe(true);
    expect(viewBox.minX + viewBox.width / 2).toBeCloseTo(230);
    expect(viewBox.minY + viewBox.height / 2).toBeCloseTo(415);
    expect(viewBox.width).toBeCloseTo(100 / 1.3);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('does not change the viewport for an empty drawing', () => {
    const editor = { struct: () => ({ isBlank: () => true }), zoom: jest.fn() };
    expect(
      Editor.prototype.fitCanvasToContent.call(editor as unknown as Editor),
    ).toBe(false);
    expect(editor.zoom).not.toHaveBeenCalled();
  });
});
