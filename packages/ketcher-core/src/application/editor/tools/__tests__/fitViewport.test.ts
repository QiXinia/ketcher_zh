import { fitViewport } from '../fitViewport';
import { ZoomTool } from '../Zoom';

describe('fitViewport', () => {
  it('centers an off-screen drawing and leaves the requested margin', () => {
    const result = fitViewport(
      { x: -100, y: 40, width: 200, height: 100 },
      { width: 800, height: 600 },
    );
    expect(result).not.toBeNull();
    expect(result!.scale).toBeCloseTo(3.76);
    expect(-100 * result!.scale + result!.x).toBeCloseTo(24);
    expect(100 * result!.scale + result!.x).toBeCloseTo(776);
    expect((40 + 50) * result!.scale + result!.y).toBeCloseTo(300);
    expect(result!.clipped).toBe(false);
  });

  it('handles tall drawings, point drawings, zoom limits and invalid viewports', () => {
    expect(
      fitViewport(
        { x: 0, y: 0, width: 50, height: 400 },
        { width: 300, height: 400 },
      )!.scale,
    ).toBeCloseTo(0.88);
    expect(
      fitViewport(
        { x: 5, y: 7, width: 0, height: 0 },
        { width: 300, height: 400 },
      )!.scale,
    ).toBe(4);
    expect(
      fitViewport(
        { x: 0, y: 0, width: 10000, height: 10000 },
        { width: 100, height: 100 },
      )!.clipped,
    ).toBe(true);
    expect(
      fitViewport({ x: 0, y: 0, width: 1, height: 1 }, { width: 0, height: 1 }),
    ).toBeNull();
    expect(
      fitViewport(
        { x: NaN, y: 0, width: 1, height: 1 },
        { width: 100, height: 100 },
      ),
    ).toBeNull();
  });
});

describe('macromolecule fit', () => {
  it('transforms the viewport from the rendered bounds and leaves entities untouched', () => {
    const transform = jest.fn();
    const wrapper = {};
    const target = {
      drawingEntitiesManager: { hasDrawingEntities: true },
      canvas: {
        node: () => ({
          getBBox: () => ({ x: 100, y: 200, width: 200, height: 100 }),
        }),
      },
      canvasWrapperSize: { width: 800, height: 600 },
      canvasWrapper: wrapper,
      MINZOOMSCALE: 0.2,
      MAXZOOMSCALE: 4,
      zoom: { transform },
    };
    expect(
      ZoomTool.prototype.zoomToFit.call(target as unknown as ZoomTool),
    ).toBe(true);
    const [actualWrapper, actualTransform] = transform.mock.calls[0];
    expect(actualWrapper).toBe(wrapper);
    expect(actualTransform.k).toBeCloseTo(3.76);
    expect(200 * actualTransform.k + actualTransform.x).toBeCloseTo(400);
    expect(250 * actualTransform.k + actualTransform.y).toBeCloseTo(300);
  });

  it('does nothing on an empty drawing or an unavailable SVG bbox', () => {
    const target = { drawingEntitiesManager: { hasDrawingEntities: false } };
    expect(
      ZoomTool.prototype.zoomToFit.call(target as unknown as ZoomTool),
    ).toBe(false);
    const unavailable = {
      drawingEntitiesManager: { hasDrawingEntities: true },
      canvas: {
        node: () => ({
          getBBox: () => {
            throw new Error('not rendered');
          },
        }),
      },
    };
    expect(
      ZoomTool.prototype.zoomToFit.call(unavailable as unknown as ZoomTool),
    ).toBe(false);
  });
});
