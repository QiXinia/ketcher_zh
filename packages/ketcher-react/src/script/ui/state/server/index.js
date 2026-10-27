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
  ChemicalMimeType,
  KetcherLogger,
  KetSerializer,
  massToChargeFromKet,
} from 'ketcher-core';
import { appUpdate } from '../options/actions';
import { setStruct } from '../options';
import { omit, without } from 'lodash/fp';

import { checkErrors } from '../modal/form';
import { indigoVerification } from '../request';
import { load } from '../shared';
import i18n from '../../../../i18n';
import {
  collectCheckErrorLocations,
  locationsForWarnings,
} from './checkLocations';

export function checkServer() {
  return (dispatch, getState) => {
    const { editor, server } = getState();

    server.then(
      (res) =>
        dispatch(
          appUpdate({
            indigoVersion: res?.indigoVersion,
            imagoVersions: res?.imagoVersions,
            server: res?.isAvailable,
          }),
        ),
      (e) => editor.errorHandler(e),
    );
  };
}

export function recognize(file, version) {
  return (dispatch, getState) => {
    const rec = getState().server.recognize;
    const editor = getState().editor;

    const process = rec(file, version).then(
      (res) => {
        dispatch(setStruct(res.struct));
      },
      (e) => {
        dispatch(setStruct(null));
        editor.errorHandler(e);
      },
    );
    dispatch(setStruct(process));
  };
}

function ketcherCheck(struct, checkParams) {
  const errors = {};
  const locations = collectCheckErrorLocations(struct, checkParams);

  if (checkParams.includes('chiral_flag')) {
    const isAbs = Array.from(struct.frags.values()).some((fr) =>
      fr ? fr.enhancedStereoFlag === 'ABS' : false,
    );
    if (isAbs) errors.chiral_flag = 'Chiral flag is present on the canvas';
  }

  if (checkParams.includes('valence')) {
    const badValenceAtomIds = locations.valence?.atoms || [];
    if (badValenceAtomIds.length > 0) {
      errors.valence = `Structure contains ${badValenceAtomIds.length} atom${
        badValenceAtomIds.length !== 1 ? 's' : ''
      } with bad valence`;
    }
  }

  return { errors, locations };
}

function localizeCheckErrors(errors) {
  if (!errors || typeof errors !== 'object') return errors;

  return Object.entries(errors).reduce((acc, [key, value]) => {
    acc[key] =
      value === 'Structure contains chirality'
        ? i18n.t('check.structureContainsChirality')
        : value;
    return acc;
  }, {});
}

export function check(optsTypes) {
  return (dispatch, getState) => {
    const { editor, server } = getState();
    const struct = editor.struct();

    // recalculate implicit hydrogens before validation
    // because for atoms in collapsed sgroups it can be not calculated
    struct.setImplicitHydrogen(undefined, true);

    const { errors: ketcherErrors, locations } = ketcherCheck(
      struct,
      optsTypes,
    );

    const options = getState().options.getServerSettings();
    options.data = { types: without(['valence', 'chiral_flag'], optsTypes) };

    return serverCall(editor, server, 'check', options)
      .then((res) => {
        res = Object.assign(res, ketcherErrors); // merge Indigo check with Ketcher check
        res = localizeCheckErrors(res);
        dispatch(checkErrors(res, locationsForWarnings(locations, res)));
      })
      .catch((e) => {
        KetcherLogger.error('index.js::check', e);
        editor.errorHandler(e);
      });
  };
}

export function automap(res) {
  return serverTransform('automap', res);
}

export function analyse() {
  return (dispatch, getState) => {
    // reset values to initial state
    dispatch({
      type: 'ANALYSE_LOADING',
    });
    const { editor, server, options } = getState();
    // The calculation service may evaluate a selection. Only derive m/z when
    // its mass and the explicit charge refer to the same complete drawing.
    const selection = editor.selection();
    const hasSelection =
      selection &&
      Object.values(selection).some(
        (value) => Array.isArray(value) && value.length > 0,
      );
    const serializer = new KetSerializer();
    let massSnapshot = '';
    try {
      if (!hasSelection) massSnapshot = serializer.serialize(editor.struct());
    } catch {}
    const serverSettings = options.getServerSettings();
    serverSettings.data = {
      properties: [
        'molecular-weight',
        'most-abundant-mass',
        'monoisotopic-mass',
        'gross',
        'mass-composition',
      ],
    };

    return serverCall(editor, server, 'calculate', serverSettings)
      .then((values) => {
        let mz;
        try {
          if (
            massSnapshot &&
            serializer.serialize(editor.struct()) === massSnapshot
          ) {
            const result = massToChargeFromKet(
              massSnapshot,
              values?.['monoisotopic-mass'],
            );
            if (result.ok) mz = result.mz;
          }
        } catch {}
        return dispatch({
          type: 'CHANGE_ANALYSE',
          data: {
            values:
              mz === undefined ? values : { ...values, 'mass-to-charge': mz },
          },
        });
      })
      .catch((e) => {
        KetcherLogger.error('index.js::analyse', e);
        editor.errorHandler(e);
      });
  };
}

export function serverTransform(method, data, struct) {
  return (dispatch, getState) => {
    const state = getState();
    const opts = state.options.getServerSettings();

    opts.data = data;
    dispatch(indigoVerification(true));

    serverCall(state.editor, state.server, method, opts, struct)
      .then((res) => {
        const loadedStruct = new KetSerializer().deserialize(res.struct);

        return dispatch(
          load(loadedStruct, {
            preserveViewport:
              method === 'aromatize' || method === 'dearomatize',
            rescale: method === 'layout',
            reactionRelayout: method === 'clean',
            method,
          }),
        );
      })
      .catch((e) => {
        KetcherLogger.error('index.js::serverTransform', e);
        state.editor.errorHandler(e);
      })
      .finally(() => {
        dispatch(indigoVerification(false));
      });
    // TODO: notification
  };
}

/*
  Indigo doesn't perform layout for enhancedFlags and just preserves their positions
  That results in structure being aligned and moved, but flags left as is.
*/
function resetStereoFlagsPosition(struct) {
  struct.frags.forEach((fragment) => (fragment.stereoFlagPosition = undefined));
}

// TODO: serverCall function should not be exported
export function serverCall(editor, server, method, options, struct) {
  const selection = editor.selection();
  let selectedAtoms = [];
  let selectedBonds = [];
  const aidMap = new Map();
  const bidMap = new Map();
  const currentStruct = (struct || editor.struct()).clone(
    null,
    null,
    false,
    aidMap,
    null,
    null,
    null,
    null,
    null,
    bidMap,
  );
  const expSel = editor.explicitSelected();
  if (selection) {
    selectedAtoms = (selection.atoms ? selection.atoms : expSel.atoms).map(
      (aid) => aidMap.get(aid),
    );
    selectedBonds = (selection.bonds ? selection.bonds : expSel.bonds).map(
      (bid) => bidMap.get(bid),
    );
  }
  if (method === 'layout') {
    resetStereoFlagsPosition(currentStruct);
  }

  const ketSerializer = new KetSerializer();
  const serializedStruct = ketSerializer.serialize(currentStruct, undefined, {
    ...selection,
    atoms: selectedAtoms,
    bonds: selectedBonds,
  });

  return server.then(() =>
    server[method](
      {
        struct: serializedStruct,
        ...(method !== 'calculate' && method !== 'check'
          ? {
              output_format: ChemicalMimeType.KET,
            }
          : null),
        ...(selectedAtoms && selectedAtoms.length > 0
          ? {
              selected: selectedAtoms,
            }
          : null),
        ...options.data,
      },
      omit('data', options),
    ),
  );
}
