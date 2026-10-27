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

import {
  FormatterFactory,
  KetcherLogger,
  KetSerializer,
  MolSerializer,
  SupportedFormat,
  massToChargeFromKet,
} from 'ketcher-core';
import i18n from '../../../i18n';

export default async function copyAs(type) {
  const state = global.currentState;
  const editor = state.editor;
  const struct = editor.structSelected();
  const errorHandler = editor.errorHandler;
  let serializer;
  try {
    const formats = {
      smiles: SupportedFormat.smiles,
      inchi: SupportedFormat.inChI,
      inchikey: SupportedFormat.inChIKey,
      cdxml: SupportedFormat.cdxml,
    };
    if (formats[type]) {
      if (!state.server)
        throw new Error(i18n.t('action.copyFormatUnavailable'));
      if (
        [struct.simpleObjects, struct.texts, struct.images].some(
          (items) => items?.size,
        )
      ) {
        throw new Error(i18n.t('action.copyFormatRequiresMolecule'));
      }
      // These formats cannot represent all KET query, reaction and graphic
      // semantics. Restrict the shortcut to one concrete molecular graph.
      const ket = new KetSerializer().serialize(struct);
      const result = massToChargeFromKet(ket, 1);
      if (!result.ok && result.reason !== 'neutral') {
        throw new Error(i18n.t('action.copyFormatRequiresMolecule'));
      }
      const options = state.options?.getServerSettings?.() || {};
      const formatter = new FormatterFactory(state.server).create(
        formats[type],
        options,
      );
      const output = await formatter.getStringFromStructureAsync(struct);
      if (typeof output !== 'string' || !output.trim()) {
        throw new Error(i18n.t('action.copyFormatUnavailable'));
      }
      if (window.clipboardData) window.clipboardData.setData('text', output);
      else await navigator.clipboard.writeText(output);
      return;
    }

    switch (type) {
      case 'mol': {
        serializer = new MolSerializer();
        break;
      }
      case 'ket': {
        serializer = new KetSerializer();
        break;
      }
      default: {
        throw new Error(i18n.t('action.copyFormatUnavailable'));
      }
    }

    const simpleObjectOrText = Boolean(
      struct.simpleObjects.size || struct.texts.size,
    );

    if (simpleObjectOrText && serializer instanceof MolSerializer) {
      errorHandler(
        'This feature is not available for Simple objects and Text objects',
      );
      return null;
    }

    const structData = serializer.serialize(struct);

    if (window.clipboardData) {
      window.clipboardData.setData('text', structData);
    } else {
      await navigator.clipboard.writeText(structData);
    }
  } catch (e) {
    KetcherLogger.error('copyAs.js::copyAs', e);
    errorHandler(e instanceof Error ? e.message : String(e));
  }
}
