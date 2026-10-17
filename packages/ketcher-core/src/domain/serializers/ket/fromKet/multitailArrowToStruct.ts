import type { Struct } from 'domain/entities/struct';
import {
  type KetFileMultitailArrowNode,
  MultitailArrow,
} from 'domain/entities/multitailArrow';
import type { KetFileNode } from 'domain/serializers/serializers.types';

export function multitailArrowToStruct(
  ketItem: KetFileNode<KetFileMultitailArrowNode>,
  struct: Struct,
) {
  const arrow = MultitailArrow.fromKetNode(ketItem);
  arrow.annotations = (ketItem.annotations ?? []).map((annotation) => ({ ...annotation }));
  struct.addMultitailArrow(arrow);
  return struct;
}
