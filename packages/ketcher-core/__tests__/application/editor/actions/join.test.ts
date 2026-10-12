import {
  SimpleObjectArrow,
  SimpleObjectFill,
  SimpleObjectMode,
  SimpleObjectStyle,
} from 'domain/entities/simpleObject';
import { Vec2 } from 'domain/entities/vec2';
import { fromJoin } from 'application/editor/actions/join';
import {
  fromSimpleObjectCurve,
  fromSimpleObjectArrow,
  fromSimpleObjectStyle,
} from 'application/editor/actions/simpleobject';

function createRestruct(points: Array<[number, number][]>) {
  const simpleObjects = new Map<number, any>();
  let nextId = points.length;
  points.forEach((line, id) => {
    simpleObjects.set(id, {
      mode: SimpleObjectMode.line,
      pos: line.map(([x, y]) => new Vec2(x, y)),
    });
  });
  const struct = {
    simpleObjects: {
      get: (id: number) => simpleObjects.get(id),
      add: (item: any) => {
        const id = nextId++;
        simpleObjects.set(id, item);
        return id;
      },
      set: (id: number, item: any) => simpleObjects.set(id, item),
      delete: (id: number) => simpleObjects.delete(id),
    },
    simpleObjectSetPos: (id: number, pos: Vec2[]) => {
      const item = simpleObjects.get(id);
      item.pos = pos;
    },
  };
  const restruct: any = {
    molecule: struct,
    simpleObjects: new Map(
      [...simpleObjects.keys()].map((id) => [id, { visel: {} }]),
    ),
    clearVisel: () => undefined,
    markItem: () => undefined,
    markItemRemoved: () => undefined,
    render: { options: {} },
  };
  return { restruct, simpleObjects };
}

describe('Join simple line objects', () => {
  it('joins touching lines and restores stable ids on undo', () => {
    const { restruct, simpleObjects } = createRestruct([
      [[0, 0], [1, 0]],
      [[2, 0], [1, 0]],
    ]);
    const inverse = fromJoin(restruct, { simpleObjects: [0, 1] });
    expect(simpleObjects.size).toBe(1);
    const joined = [...simpleObjects.values()][0];
    expect(joined.mode).toBe(SimpleObjectMode.polyline);
    expect(joined.pos.map((point) => [point.x, point.y])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);

    inverse.perform(restruct);
    expect(simpleObjects.get(0)?.mode).toBe(SimpleObjectMode.line);
    expect(simpleObjects.get(1)?.mode).toBe(SimpleObjectMode.line);
    expect(simpleObjects.has(2)).toBe(false);
  });

  it('reverses a line when its far endpoint touches the current tail', () => {
    const { restruct, simpleObjects } = createRestruct([
      [[0, 0], [1, 0]],
      [[2, 0], [1, 0]],
    ]);
    fromJoin(restruct, { simpleObjects: [0, 1] });
    expect([...simpleObjects.values()][0].pos.map((point) => point.x)).toEqual([
      0, 1, 2,
    ]);
  });

  it('rejects disconnected or insufficient selections', () => {
    const disconnected = createRestruct([
      [[0, 0], [1, 0]],
      [[3, 0], [4, 0]],
    ]);
    expect(() => fromJoin(disconnected.restruct, { simpleObjects: [0, 1] })).toThrow(
      '所选曲线无法连接',
    );
    expect(() => fromJoin(disconnected.restruct, { simpleObjects: [0] })).toThrow(
      'Join 至少需要选择两条直线曲线',
    );
  });
});

describe('Simple line object styles', () => {
  it('changes style and restores it through the inverse action', () => {
    const { restruct, simpleObjects } = createRestruct([[[0, 0], [1, 0]]]);
    simpleObjects.get(0).style = SimpleObjectStyle.plain;
    const action = fromSimpleObjectStyle(0, SimpleObjectStyle.dashed);
    const inverse = action.perform(restruct);
    expect(simpleObjects.get(0).style).toBe(SimpleObjectStyle.dashed);
    inverse.perform(restruct);
    expect(simpleObjects.get(0).style).toBe(SimpleObjectStyle.plain);
  });

  it('changes endpoint arrows and restores them through the inverse action', () => {
    const { restruct, simpleObjects } = createRestruct([[[0, 0], [1, 0]]]);
    simpleObjects.get(0).startArrow = SimpleObjectArrow.none;
    simpleObjects.get(0).endArrow = SimpleObjectArrow.none;
    const startAction = fromSimpleObjectArrow(
      0,
      'start',
      SimpleObjectArrow.halfRight,
    );
    const startInverse = startAction.perform(restruct);
    expect(simpleObjects.get(0).startArrow).toBe(SimpleObjectArrow.halfRight);
    startInverse.perform(restruct);
    expect(simpleObjects.get(0).startArrow).toBe(SimpleObjectArrow.none);

    const endInverse = fromSimpleObjectArrow(
      0,
      'end',
      SimpleObjectArrow.full,
    ).perform(restruct);
    expect(simpleObjects.get(0).endArrow).toBe(SimpleObjectArrow.full);
    endInverse.perform(restruct);
    expect(simpleObjects.get(0).endArrow).toBe(SimpleObjectArrow.none);
  });

  it('changes composable curve decorations and restores them through inverse actions', () => {
    const { restruct, simpleObjects } = createRestruct([[[0, 0], [1, 0]]]);
    const cases = [
      ['doubled', true],
      ['closed', true],
      ['fill', SimpleObjectFill.shaded],
      ['faded', true],
    ] as const;
    cases.forEach(([property, value]) => {
      const inverse = fromSimpleObjectCurve(0, property, value).perform(restruct);
      expect(simpleObjects.get(0)[property]).toBe(value);
      inverse.perform(restruct);
      expect(simpleObjects.get(0)[property]).toBe(
        property === 'fill' ? SimpleObjectFill.none : false,
      );
    });
  });
});
