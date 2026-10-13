import { ReStruct, Render } from 'application/render';
import type { RenderOptions } from 'application/render/render.types';
import ReSimpleObject from 'application/render/restruct/resimpleObject';
import { SimpleObjectBracketType, SimpleObjectMode, Struct, Vec2 } from 'domain/entities';

const ellipse = {
  mode: SimpleObjectMode.ellipse,
  pos: [
    new Vec2({
      x: 5.025,
      y: 9.600000000000001,
      z: 0,
    }),
    new Vec2({
      x: 10.05,
      y: 12.200000000000001,
      z: 0,
    }),
  ],
};
const rectangle = {
  mode: SimpleObjectMode.ellipse,
  pos: [
    new Vec2({
      x: 7.2250000000000005,
      y: 10.3,
      z: 0,
    }),
    new Vec2({
      x: 11.100000000000001,
      y: 12.825000000000001,
      z: 0,
    }),
  ],
};
const line = {
  mode: SimpleObjectMode.ellipse,
  pos: [
    new Vec2({
      x: 7.7,
      y: 9.125,
      z: 0,
    }),
    new Vec2({
      x: 11.3,
      y: 12.4,
      z: 0,
    }),
  ],
};
const bezier = {
  mode: SimpleObjectMode.bezier,
  pos: [new Vec2(1, 2), new Vec2(3, 0), new Vec2(6, 5), new Vec2(8, 2)],
};
const multiBezier = {
  mode: SimpleObjectMode.bezier,
  pos: [new Vec2(1, 2), new Vec2(2, 0), new Vec2(4, 0), new Vec2(5, 2), new Vec2(6, 4), new Vec2(8, 4), new Vec2(9, 2)],
};
const bracket = {
  mode: SimpleObjectMode.bracket,
  bracketType: SimpleObjectBracketType.brace,
  pos: [new Vec2(2, 2), new Vec2(12, 18)],
};
it('should get hover path and style for simple objects correctly', () => {
  [ellipse, rectangle, line].forEach((simpleObject) => {
    const reSimpleObject = new ReSimpleObject(simpleObject);
    const option = {
      microModeScale: 20,
      width: 100,
      height: 100,
    } as RenderOptions;
    const render = new Render(document as unknown as HTMLElement, option);
    const paths = reSimpleObject.hoverPath(render);
    expect(
      paths.filter((path) => path.path.attrs.stroke === '#CCFFDD')?.length,
    ).toBeGreaterThanOrEqual(1);
  });
});

it('should get selection plate for simple objects correctly with selection points in a separated set', () => {
  const reSimpleObject = new ReSimpleObject(ellipse);
  const initialPathLength = reSimpleObject.visel.paths.length;
  const option = {
    microModeScale: 20,
    width: 100,
    height: 100,
  } as RenderOptions;
  const render = new Render(document as unknown as HTMLElement, option);
  const restruct = new ReStruct(new Struct(), render);
  reSimpleObject.makeSelectionPlate(restruct, render.paper, render.options);
  expect(initialPathLength + 1).toEqual(reSimpleObject.visel.paths.length);
});

it('should expose four editable Bezier control points and render a cubic path', () => {
  const reSimpleObject = new ReSimpleObject(bezier);
  expect(reSimpleObject.getReferencePoints()).toHaveLength(4);
  const option = {
    microModeScale: 20,
    width: 100,
    height: 100,
  } as RenderOptions;
  const render = new Render(document as unknown as HTMLElement, option);
  const paths = reSimpleObject.hoverPath(render);
  expect(paths).toHaveLength(1);
  expect(paths[0].path.attrs.path.join(' ')).toContain('C');
});

it('should render every segment of a multi-segment Bezier path', () => {
  const reSimpleObject = new ReSimpleObject(multiBezier);
  expect(reSimpleObject.getReferencePoints()).toHaveLength(7);
  const option = { microModeScale: 20, width: 100, height: 100 } as RenderOptions;
  const render = new Render(document as unknown as HTMLElement, option);
  const paths = reSimpleObject.hoverPath(render);
  expect(paths[0].path.attrs.path.join(' ')).toMatch(/C.*C/);
  expect(reSimpleObject.calcDistance(new Vec2(8, 3), 1).minDist).toBeLessThan(2);
});

it('should render independent bracket pairs with editable corner points', () => {
  const reSimpleObject = new ReSimpleObject(bracket);
  expect(reSimpleObject.getReferencePoints()).toHaveLength(2);
  const option = {
    microModeScale: 20,
    width: 100,
    height: 100,
  } as RenderOptions;
  const render = new Render(document as unknown as HTMLElement, option);
  const paths = reSimpleObject.hoverPath(render);
  expect(paths).toHaveLength(1);
  expect(paths[0].path.attrs.path.join(' ')).toContain('C');
});
