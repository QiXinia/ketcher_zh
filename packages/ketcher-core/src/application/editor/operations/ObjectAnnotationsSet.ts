import { BaseOperation } from './BaseOperation';
import { OperationPriority, OperationType } from './OperationType';
import type { ObjectAnnotation } from 'domain/entities/BaseMicromoleculeEntity';
import type ReStruct from '../../render/restruct/restruct';

export type ObjectAnnotationTarget = {
  mapName:
    | 'atoms'
    | 'bonds'
    | 'sgroups'
    | 'rxnArrows'
    | 'rxnPluses'
    | 'simpleObjects'
    | 'texts'
    | 'images'
    | 'multitailArrows';
  id: number;
};

function cloneAnnotations(annotations?: ObjectAnnotation[]): ObjectAnnotation[] {
  return (annotations ?? []).map((annotation) => ({ ...annotation }));
}

export class ObjectAnnotationsSet extends BaseOperation {
  readonly data: {
    targets: ObjectAnnotationTarget[];
    annotations: ObjectAnnotation[];
    annotationsByTarget?: ObjectAnnotation[][];
    previousAnnotations?: ObjectAnnotation[][];
  };

  constructor(targets: ObjectAnnotationTarget[], annotations: ObjectAnnotation[]) {
    super(OperationType.OBJECT_ANNOTATIONS_SET, OperationPriority.ATOM_ATTR);
    this.data = {
      targets: targets.map((target) => ({ ...target })),
      annotations: cloneAnnotations(annotations),
    };
  }

  execute(restruct: ReStruct): void {
    const previous: ObjectAnnotation[][] = [];
    this.data.targets.forEach((target) => {
      const entity = restruct.molecule[target.mapName]?.get(target.id);
      if (!entity) {
        previous.push([]);
        return;
      }
      previous.push(cloneAnnotations(entity.annotations));
      const annotations =
        this.data.annotationsByTarget?.[previous.length - 1] ??
        this.data.annotations;
      entity.annotations = cloneAnnotations(annotations);
      ObjectAnnotationsSet.invalidateItem(restruct, target.mapName, target.id, 1);
    });
    if (!this.data.previousAnnotations) this.data.previousAnnotations = previous;
  }

  invert(): ObjectAnnotationsSet {
    const previousAnnotations = this.data.previousAnnotations ?? [];
    const desiredAnnotations = this.data.targets.map(
      (_target, index) =>
        cloneAnnotations(
          this.data.annotationsByTarget?.[index] ?? this.data.annotations,
        ),
    );
    const inverted = new ObjectAnnotationsSet(
      this.data.targets,
      previousAnnotations[0] ?? [],
    );
    inverted.data.annotationsByTarget = previousAnnotations.map((annotations) =>
      cloneAnnotations(annotations),
    );
    inverted.data.previousAnnotations = desiredAnnotations;
    return inverted;
  }

  isDummy(restruct: ReStruct): boolean {
    return this.data.targets.every((target, index) => {
      const entity = restruct.molecule[target.mapName]?.get(target.id);
      const desired =
        this.data.annotationsByTarget?.[index] ?? this.data.annotations;
      return (
        JSON.stringify(entity?.annotations ?? []) === JSON.stringify(desired)
      );
    });
  }
}
