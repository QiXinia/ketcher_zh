import { RingFill } from 'domain/entities/ringFill';
import type { ReStruct } from '../../render';
import { BaseOperation } from './BaseOperation';
import { OperationType } from './OperationType';

export class RingFillSet extends BaseOperation {
  readonly data: { id?: number; fill?: RingFill; previousFill?: RingFill };

  constructor(fill?: RingFill, id?: number) {
    super(OperationType.RING_FILL_SET);
    this.data = { id, fill: fill?.clone() };
  }

  execute(restruct: ReStruct): void {
    const fills = restruct.molecule.ringFills;
    const id = this.data.id ?? fills.newId();
    this.data.id = id;
    this.data.previousFill = fills.get(id)?.clone();
    if (this.data.fill) fills.set(id, this.data.fill.clone());
    else fills.delete(id);
    // Ring visuals must repaint on undo/redo too, including a removed fill.
    restruct.markItemRemoved();
  }

  invert(): RingFillSet {
    return new RingFillSet(this.data.previousFill, this.data.id);
  }

  isDummy(restruct?: ReStruct): boolean {
    if (!restruct) return false;
    const previous = restruct.molecule.ringFills.get(this.data.id as number);
    return this.data.fill
      ? !!previous && previous.color === this.data.fill.color &&
          previous.matches(this.data.fill.atoms, this.data.fill.bonds)
      : !previous;
  }
}
