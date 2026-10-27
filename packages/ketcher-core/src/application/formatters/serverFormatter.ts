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

import type {
  ConvertData,
  ConvertResult,
  LayoutData,
  LayoutResult,
  StructService,
  StructServiceOptions,
} from 'domain/services';
import { type StructFormatter, SupportedFormat } from './structFormatter.types';

import type { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import type { Struct } from 'domain/entities/struct';
import type { DrawingEntitiesManager } from 'domain/entities/DrawingEntitiesManager';
import { getPropertiesByFormat } from './formatProperties';
import { KetcherLogger } from 'utilities';
import { SmilesFormatter } from './smilesFormatter';
import { normalizeCmlForIndigo } from './normalizeCmlForIndigo';
import { ChemicalMimeType } from 'domain/services/struct/structService.types';

type ConvertPromise = (
  data: ConvertData,
  options?: StructServiceOptions,
) => Promise<ConvertResult>;

type LayoutPromise = (
  data: LayoutData,
  options?: StructServiceOptions,
) => Promise<LayoutResult>;

export class ServerFormatter implements StructFormatter {
  readonly #structService: StructService;
  readonly #ketSerializer: KetSerializer;
  readonly #format: SupportedFormat;
  readonly #options?: StructServiceOptions;

  constructor(
    structService: StructService,
    ketSerializer: KetSerializer,
    format: SupportedFormat,
    options?: StructServiceOptions,
  ) {
    this.#structService = structService;
    this.#ketSerializer = ketSerializer;
    this.#format = format;
    this.#options = options;
  }

  async getStringFromStructureAsync(
    struct: Struct,
    drawingEntitiesManager?: DrawingEntitiesManager,
  ): Promise<string> {
    const formatProperties = getPropertiesByFormat(this.#format);

    try {
      const stringifiedStruct = this.#ketSerializer.serialize(
        struct,
        drawingEntitiesManager,
      );
      const convertResult = await this.#structService.convert(
        {
          struct: stringifiedStruct,
          output_format: formatProperties.mime,
        },
        { ...this.#options, ...formatProperties.options },
      );

      return convertResult.struct;
    } catch (e: unknown) {
      let message;
      if (e instanceof Error && e.message === 'Server is not compatible') {
        message = `${formatProperties.name} is not supported.`;
      } else {
        const details = e instanceof Error ? e.message : String(e);
        message = `Convert error!\n${details}`;
      }
      KetcherLogger.error('serverFormatter.ts::getStringFromStructureAsync', e);
      throw new Error(message);
    }
  }

  getCallingMethod(
    stringifiedStruct: string,
    format: SupportedFormat,
  ): {
    method: LayoutPromise | ConvertPromise;
    struct: string;
  } {
    if (this.#format === SupportedFormat.smiles) {
      return {
        method: SmilesFormatter.isContainsCoordinates(stringifiedStruct)
          ? this.#structService.convert
          : this.#structService.layout,
        struct: stringifiedStruct,
      };
    }
    const withCoords = getPropertiesByFormat(format).supportsCoords;
    if (withCoords) {
      return {
        method: this.#structService.convert,
        struct: stringifiedStruct,
      };
    }
    return {
      method: this.#structService.layout,
      struct: stringifiedStruct.trim(),
    };
  }

  async getStructureFromStringAsync(
    stringifiedStruct: string,
  ): Promise<Struct> {
    const data: ConvertData | LayoutData = {
      struct: undefined as any,
      output_format: getPropertiesByFormat(SupportedFormat.ket).mime,
    };

    const { method, struct } = this.getCallingMethod(
      this.#format === SupportedFormat.cml
        ? normalizeCmlForIndigo(stringifiedStruct)
        : stringifiedStruct,
      this.#format,
    );
    data.struct = struct;

    try {
      // Struct services are class instances; retain their receiver when the
      // selected convert/layout method is invoked through a variable.
      const result = await method.call(
        this.#structService,
        data,
        this.#options,
      );
      if (this.#format === SupportedFormat.cml) {
        // Indigo can silently drop CML stereochemistry when constructing KET.
        // Equality is deliberately conservative; uncertainty blocks the load.
        const before = await this.#structService.convert({
          struct,
          input_format: ChemicalMimeType.CML,
          output_format: ChemicalMimeType.DaylightSmiles,
        });
        const after = await this.#structService.convert({
          struct: result.struct,
          input_format: ChemicalMimeType.KET,
          output_format: ChemicalMimeType.DaylightSmiles,
        });
        const beforeIdentity = String(before.struct || '').trim();
        if (
          !beforeIdentity ||
          beforeIdentity !== String(after.struct || '').trim()
        ) {
          throw new Error(
            'CML conversion could not preserve the chemical or stereochemical structure',
          );
        }
      }
      const parsedStruct = this.#ketSerializer.deserialize(result.struct);
      if (method === this.#structService.layout) {
        parsedStruct.rescale();
      }
      return parsedStruct;
    } catch (e: unknown) {
      if (!(e instanceof Error) || e.message !== 'Server is not compatible') {
        KetcherLogger.error(
          'serverFormatter.ts::getStructureFromStringAsync',
          e,
        );
        const details = e instanceof Error ? e.message : String(e);
        throw Error(`Convert error!\n${details}`);
      }

      const formatError =
        this.#format === 'smiles'
          ? `${
              getPropertiesByFormat(SupportedFormat.smilesExt).name
            } and opening of ${
              getPropertiesByFormat(SupportedFormat.smiles).name
            }`
          : getPropertiesByFormat(this.#format).name;

      throw Error(`${formatError} is not supported in standalone mode.`);
    }
  }
}
