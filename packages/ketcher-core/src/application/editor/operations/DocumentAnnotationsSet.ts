/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 ***************************************************************************/

import { BaseOperation } from './BaseOperation';
import { OperationType } from './OperationType';
import type { ReStruct } from '../../render';
import type { DocumentAnnotation } from 'domain/entities/struct';

export class DocumentAnnotationsSet extends BaseOperation {
  readonly data: {
    annotations: DocumentAnnotation[];
    previousAnnotations?: DocumentAnnotation[];
  };

  constructor(annotations: DocumentAnnotation[]) {
    super(OperationType.DOCUMENT_ANNOTATIONS_SET);
    this.data = {
      annotations: annotations.map((annotation) => ({ ...annotation })),
    };
  }

  execute(restruct: ReStruct): void {
    this.data.previousAnnotations = restruct.molecule.annotations.map(
      (annotation) => ({ ...annotation }),
    );
    restruct.molecule.annotations = this.data.annotations.map((annotation) => ({
      ...annotation,
    }));
  }

  invert(): DocumentAnnotationsSet {
    const inverted = new DocumentAnnotationsSet(this.data.previousAnnotations || []);
    inverted.data.previousAnnotations = this.data.annotations.map((annotation) => ({
      ...annotation,
    }));
    return inverted;
  }

  isDummy(restruct?: ReStruct): boolean {
    if (!restruct) return false;
    return JSON.stringify(restruct.molecule.annotations) === JSON.stringify(this.data.annotations);
  }
}
