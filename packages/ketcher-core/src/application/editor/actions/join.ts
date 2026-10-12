/**
 * Join selected line drawing objects into one polyline.
 *
 * ChemDraw treats Join as a curve operation. Ketcher already serializes
 * polyline simple objects, so the action only needs to replace the selected
 * line objects with one polyline while keeping a single undoable operation.
 */
import type { ReStruct } from 'application/render';
import {
  SimpleObjectArrow,
  SimpleObjectFill,
  SimpleObjectMode,
  SimpleObjectStyle,
  SimpleObjectBracketType,
} from 'domain/entities/simpleObject';
import { Vec2 } from 'domain/entities/vec2';
import type { EditorSelection } from '../editor.types';
import { Action } from './action';
import { SimpleObjectAdd, SimpleObjectDelete } from '../operations';

type JoinSelection = EditorSelection & { simpleObjects?: number[] };
type JoinLine = {
  id: number;
  pos: Vec2[];
  style?: SimpleObjectStyle;
  startArrow?: SimpleObjectArrow;
  endArrow?: SimpleObjectArrow;
  doubled?: boolean;
  closed?: boolean;
  fill?: SimpleObjectFill;
  faded?: boolean;
  color?: string;
  bracketType?: SimpleObjectBracketType;
};

function distance(a: Vec2, b: Vec2): number {
  return Vec2.dist(a, b);
}

const JOIN_ENDPOINT_TOLERANCE = 0.2;

function connectLines(lines: JoinLine[]): Vec2[] | null {
  if (lines.length < 2) return null;
  const remaining = lines.slice(1);
  let points = lines[0].pos.map(point => new Vec2(point));

  while (remaining.length) {
    const tail = points[points.length - 1];
    const head = points[0];
    let bestIndex = -1;
    let bestSide: 'head' | 'tail' | null = null;
    let bestReverse = false;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((line, index) => {
      const start = line.pos[0];
      const end = line.pos[line.pos.length - 1];
      const candidates: Array<[
        number,
        'head' | 'tail',
        boolean,
      ]> = [
        [distance(tail, start), 'tail', false],
        [distance(tail, end), 'tail', true],
        [distance(head, end), 'head', false],
        [distance(head, start), 'head', true],
      ];
      candidates.forEach(([candidateDistance, side, reverse]) => {
        if (candidateDistance < bestDistance) {
          bestDistance = candidateDistance;
          bestIndex = index;
          bestSide = side;
          bestReverse = reverse;
        }
      });
    });

    if (bestIndex < 0 || !bestSide || bestDistance > JOIN_ENDPOINT_TOLERANCE) {
      return null;
    }

    const next = remaining.splice(bestIndex, 1)[0];
    const nextPoints = next.pos.map(point => new Vec2(point));
    if (bestReverse) nextPoints.reverse();
    if (bestSide === 'tail') {
      points = points.concat(nextPoints.slice(1));
    } else {
      points = nextPoints.slice(0, -1).concat(points);
    }
  }

  return points;
}

function arrowAt(line: JoinLine, point: Vec2): SimpleObjectArrow {
  if (distance(line.pos[0], point) <= JOIN_ENDPOINT_TOLERANCE) {
    return line.startArrow ?? SimpleObjectArrow.none;
  }
  if (distance(line.pos[line.pos.length - 1], point) <= JOIN_ENDPOINT_TOLERANCE) {
    return line.endArrow ?? SimpleObjectArrow.none;
  }
  return SimpleObjectArrow.none;
}

/** Join two or more selected line curves into one KET polyline. */
export function fromJoin(restruct: ReStruct, selection: JoinSelection | null) {
  const struct = restruct.molecule;
  const selectedIds = selection?.simpleObjects ?? [];
  const lines = selectedIds
    .map(id => ({ id, item: struct.simpleObjects.get(id) }))
    .filter(({ item }) => item?.mode === SimpleObjectMode.line)
    .map(({ id, item }) => ({
      id,
      pos: item!.pos,
      style: item!.style,
      startArrow: item!.startArrow,
      endArrow: item!.endArrow,
      doubled: item!.doubled,
      closed: item!.closed,
      fill: item!.fill,
      faded: item!.faded,
      color: item!.color,
      bracketType: item!.bracketType,
    }));

  if (lines.length < 2) {
    throw new Error('Join 至少需要选择两条直线曲线');
  }

  const points = connectLines(lines);
  if (!points || points.length < 3) {
    throw new Error('所选曲线无法连接');
  }

  const action = new Action();
  lines.forEach(({ id }) => action.addOp(new SimpleObjectDelete(id)));
  const startLine = lines.find((line) =>
    line.pos.some((point) => distance(point, points[0]) <= JOIN_ENDPOINT_TOLERANCE),
  );
  const endPoint = points[points.length - 1];
  const endLine = lines.find((line) =>
    line.pos.some((point) => distance(point, endPoint) <= JOIN_ENDPOINT_TOLERANCE),
  );
  action.addOp(
    new SimpleObjectAdd(
      points,
      SimpleObjectMode.polyline,
      false,
      undefined,
      lines[0].style ?? SimpleObjectStyle.plain,
      startLine ? arrowAt(startLine, points[0]) : SimpleObjectArrow.none,
      endLine ? arrowAt(endLine, endPoint) : SimpleObjectArrow.none,
      lines[0].doubled,
      lines[0].closed,
      lines[0].fill,
      lines[0].faded,
      lines[0].bracketType,
      lines[0].color,
    ),
  );
  return action.perform(restruct);
}
