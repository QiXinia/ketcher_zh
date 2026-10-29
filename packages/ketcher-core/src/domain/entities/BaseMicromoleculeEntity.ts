/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

export const INVALID = 'invalid';
export type initiallySelectedType = boolean | 'invalid';

export type ObjectAnnotation = {
  keyword: string;
  content: string;
};

export type ObjectAnnotationInput = {
  initiallySelected?: initiallySelectedType;
  annotations?: ObjectAnnotation[];
};

export abstract class BaseMicromoleculeEntity {
  initiallySelected?: initiallySelectedType;
  annotations: ObjectAnnotation[];

  protected constructor(
    initiallySelectedOrAttributes?: initiallySelectedType | ObjectAnnotationInput,
    annotations?: ObjectAnnotation[],
  ) {
    if (
      initiallySelectedOrAttributes &&
      typeof initiallySelectedOrAttributes === 'object'
    ) {
      this.initiallySelected = initiallySelectedOrAttributes.initiallySelected;
      this.annotations = cloneObjectAnnotations(
        initiallySelectedOrAttributes.annotations,
      );
    } else {
      this.initiallySelected = initiallySelectedOrAttributes;
      this.annotations = cloneObjectAnnotations(annotations);
    }
  }

  getInitiallySelected(): boolean | undefined {
    if (this.initiallySelected === INVALID) {
      throw new Error(
        'this field is used only for serialization/deserialization',
      );
    }
    return this.initiallySelected;
  }

  setInitiallySelected(value?: boolean): void {
    if (this.initiallySelected === INVALID) {
      throw new Error(
        'this field is used only for serialization/deserialization',
      );
    }
    this.initiallySelected = value;
  }

  resetInitiallySelected(invalidate?: boolean): void {
    this.initiallySelected = invalidate ? INVALID : undefined;
  }
}

export function cloneObjectAnnotations(
  annotations?: ObjectAnnotation[] | null,
): ObjectAnnotation[] {
  if (!Array.isArray(annotations)) return [];
  return annotations
    .filter(
      (annotation) =>
        annotation &&
        typeof annotation.keyword === 'string' &&
        typeof annotation.content === 'string',
    )
    .map((annotation) => ({
      keyword: annotation.keyword,
      content: annotation.content,
    }));
}
