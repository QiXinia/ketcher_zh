/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import type { SdfItem } from './sdf.types';
import {
  parseSdfRecords,
  serializeSdfRecord,
  type SdfParseOptions,
} from './sdfRecords';

import { MolSerializer } from '../mol/molSerializer';
import type { Serializer } from '../serializers.types';
import type { MolSerializerOptions } from '../mol';

export class SdfSerializer implements Serializer<Array<SdfItem>> {
  private readonly molSerializerOptions?: Partial<MolSerializerOptions>;
  private readonly sdfParseOptions?: SdfParseOptions;

  constructor(
    options?: Partial<MolSerializerOptions>,
    sdfParseOptions?: SdfParseOptions,
  ) {
    this.molSerializerOptions = options;
    this.sdfParseOptions = sdfParseOptions;
  }

  deserialize(content: string): Array<SdfItem> {
    const molSerializer = new MolSerializer(this.molSerializerOptions);
    return parseSdfRecords(content, this.sdfParseOptions).map(
      ({ molfile, props }) => ({
        struct: molSerializer.deserialize(molfile),
        props,
      }),
    );
  }

  serialize(sdfItems: Array<SdfItem>): string {
    const molSerializer = new MolSerializer(this.molSerializerOptions);
    return sdfItems
      .map((item) =>
        serializeSdfRecord({
          molfile: molSerializer.serialize(item.struct),
          props: Object.fromEntries(
            Object.entries(item.props).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
        }),
      )
      .join('');
  }
}
