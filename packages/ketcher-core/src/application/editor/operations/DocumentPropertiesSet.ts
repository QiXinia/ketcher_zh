/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0.
 ***************************************************************************/

import { BaseOperation } from './BaseOperation';
import { OperationType } from './OperationType';
import type { ReStruct } from '../../render';
import type { DocumentProperty } from 'domain/entities/struct';

function cloneProperties(properties: DocumentProperty[]): DocumentProperty[] {
  return properties.map((property) => ({ ...property }));
}

export class DocumentPropertiesSet extends BaseOperation {
  readonly data: {
    properties: DocumentProperty[];
    previousProperties?: DocumentProperty[];
  };

  constructor(properties: DocumentProperty[]) {
    super(OperationType.DOCUMENT_PROPERTIES_SET);
    this.data = { properties: cloneProperties(properties) };
  }

  execute(restruct: ReStruct): void {
    this.data.previousProperties = cloneProperties(restruct.molecule.properties);
    restruct.molecule.properties = cloneProperties(this.data.properties);
  }

  invert(): DocumentPropertiesSet {
    const inverted = new DocumentPropertiesSet(this.data.previousProperties || []);
    inverted.data.previousProperties = cloneProperties(this.data.properties);
    return inverted;
  }

  isDummy(restruct?: ReStruct): boolean {
    if (!restruct) return false;
    return JSON.stringify(restruct.molecule.properties) === JSON.stringify(this.data.properties);
  }
}
