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
  BottomToolbarContainer,
  LeftToolbarContainer,
  RightToolbarContainer,
  TopToolbarContainer,
} from '../views/toolbars';
import { useCallback, useEffect, type ReactElement } from 'react';
import { createTheme, Snackbar, ThemeProvider } from '@mui/material';
import AppClipArea from '../views/AppClipArea';
import { AppHiddenContainer } from './AppHidden';
import AppModalContainer from '../views/modal';
import ConnectedEditor from '../views/Editor';
import classes from './App.module.less';
import { initFGroups, initFGTemplates } from '../state/functionalGroups';
import {
  initSaltsAndSolvents,
  initSaltsAndSolventsTemplates,
} from '../state/saltsAndSolvents';
import {
  useAppContext,
  useSubscriptionOnEvents,
  useSettings,
} from '../../../hooks';
import { AbbreviationLookupContainer } from '../dialog/AbbreviationLookup';
import { initLib } from '../state/templates/init-lib';
import { ketcherProvider } from 'ketcher-core';
import { useAppDispatch } from '../state/hooks';
import { selectSnackbarNotificationText } from '../state/notifications';
import { useSelector } from 'react-redux';
import { IconButton } from 'components';
import { Action, Bond, fromAtomsAttrs, fromBondsAttrs, KetcherLogger } from 'ketcher-core';
import { openDialog } from '../state/modal';
import { fromAtom, fromBond, toAtom, toBond } from '../data/convert/structconv';
import { updateOnlyChangedProperties } from '../state/modal/utils';
import SGroupTool from '../../editor/tool/sgroup';
import { prepareDataAttachment } from '../../editor/tool/dataAttachment';

interface QueryStructureOptions {
  atom?: {
    aromaticity?: '' | 'aromatic' | 'aliphatic';
    implicitHydrogens?: '' | 'allowed' | 'not-allowed' | number;
    ringBondCount?: '' | -2 | -1 | 0 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    ringMembership?: '' | number;
    ringSize?: '' | number;
    connectivity?: '' | number;
    chirality?: '' | 'anticlockwise' | 'clockwise';
    substitutionQueryMode?: '' | 'free-sites' | 'up-to' | 'exactly';
    substitutionQueryCount?: number;
    unsaturation?: '' | 'must-be-absent' | 'must-be-present';
    translation?: '' | 'equal' | 'broad' | 'narrow' | 'any';
    reactionChange?: '' | 'anything' | 'specified';
    reactionStereo?: '' | 'any' | 'inversion' | 'retention';
    customQuery?: string;
  };
  bond?: {
    topology?: '' | 'ring' | 'chain';
    customQuery?: string;
  };
}

interface QueryStructureEventDetail {
  options?: QueryStructureOptions;
  error?: string;
}

function applyQueryStructureOptions(editor: any, options: QueryStructureOptions) {
  const selection = editor.selection?.() ?? {};
  const atomIds = Array.isArray(selection.atoms) ? selection.atoms : [];
  const bondIds = Array.isArray(selection.bonds) ? selection.bonds : [];
  if (!atomIds.length && !bondIds.length) throw new Error('请先选择需要设置查询选项的原子或键');
  const atomOptions = options.atom || {};
  const bondOptions = options.bond || {};
  const restruct = editor.render.ctab;
  const action = new Action();
  const hasValue = (value: unknown): boolean => value !== '' && value !== undefined;

  atomIds.forEach((id: number) => {
    const atom = restruct.molecule.atoms.get(id);
    if (!atom) return;
    const queryProperties = { ...atom.queryProperties };
    const changed: Record<string, unknown> = { ...atom };
    const setQuery = (key: string, value: unknown) => {
      if (hasValue(value)) queryProperties[key] = value;
    };
    const structuredQueryValues = [
      atomOptions.aromaticity,
      atomOptions.implicitHydrogens,
      atomOptions.ringBondCount,
      atomOptions.ringMembership,
      atomOptions.ringSize,
      atomOptions.connectivity,
      atomOptions.chirality,
      atomOptions.substitutionQueryMode,
      atomOptions.unsaturation,
      atomOptions.translation,
      atomOptions.reactionChange,
      atomOptions.reactionStereo,
    ];
    if (hasValue(atomOptions.customQuery) && structuredQueryValues.some(hasValue)) {
      throw new Error('自定义原子查询不能与其他原子查询谓词同时设置');
    }
    setQuery('aromaticity', atomOptions.aromaticity);
    if (hasValue(atomOptions.implicitHydrogens)) {
      changed.implicitHCount = atomOptions.implicitHydrogens === 'not-allowed'
        ? 0
        : atomOptions.implicitHydrogens === 'allowed'
          ? null
          : Number(atomOptions.implicitHydrogens);
    }
    if (hasValue(atomOptions.ringBondCount)) changed.ringBondCount = Number(atomOptions.ringBondCount);
    setQuery('ringMembership', atomOptions.ringMembership);
    setQuery('ringSize', atomOptions.ringSize);
    setQuery('connectivity', atomOptions.connectivity);
    setQuery('chirality', atomOptions.chirality);
    setQuery('unsaturation', atomOptions.unsaturation);
    setQuery('translation', atomOptions.translation);
    if (hasValue(atomOptions.reactionChange)) changed.exactChangeFlag = atomOptions.reactionChange === 'specified' ? 1 : 0;
    if (hasValue(atomOptions.reactionStereo)) {
      const reactionStereo = String(atomOptions.reactionStereo) as 'any' | 'inversion' | 'retention';
      changed.invRet = ({ any: 0, inversion: 1, retention: 2 } as const)[reactionStereo];
    }
    if (hasValue(atomOptions.customQuery)) {
      const customQuery = String(atomOptions.customQuery);
      if (/\s/.test(customQuery)) throw new Error('自定义原子查询不能包含空格');
      queryProperties.customQuery = customQuery;
      queryProperties.aromaticity = null;
      queryProperties.ringMembership = null;
      queryProperties.ringSize = null;
      queryProperties.connectivity = null;
      queryProperties.chirality = null;
      queryProperties.substitutionQuery = null;
      queryProperties.unsaturation = null;
      queryProperties.translation = null;
      changed.label = 'A';
      changed.atomList = null;
      changed.alias = null;
      changed.charge = null;
      changed.isotope = null;
      changed.explicitValence = -1;
      changed.radical = 0;
      changed.ringBondCount = 0;
      changed.hCount = 0;
      changed.substitutionCount = 0;
      changed.ringBondCount = 0;
      changed.unsaturatedAtom = 0;
      changed.implicitHCount = null;
      changed.exactChangeFlag = 0;
      changed.invRet = 0;
    }
    if (!hasValue(atomOptions.customQuery) && structuredQueryValues.some(hasValue)) {
      queryProperties.customQuery = null;
    }
    if (hasValue(atomOptions.substitutionQueryMode)) {
      queryProperties.substitutionQuery = {
        mode: atomOptions.substitutionQueryMode,
        count: Number(atomOptions.substitutionQueryCount ?? 0),
      };
    }
    changed.queryProperties = queryProperties;
    action.mergeWith(fromAtomsAttrs(restruct, id, changed, false));
  });

  bondIds.forEach((id: number) => {
    const bond = restruct.molecule.bonds.get(id);
    if (!bond) return;
    const changed: Record<string, unknown> = { ...bond };
    if (hasValue(bondOptions.customQuery) && hasValue(bondOptions.topology)) {
      throw new Error('自定义键查询不能与拓扑谓词同时设置');
    }
    if (hasValue(bondOptions.topology)) {
      changed.topology = bondOptions.topology === 'ring'
        ? Bond.PATTERN.TOPOLOGY.RING
        : Bond.PATTERN.TOPOLOGY.CHAIN;
    }
    if (hasValue(bondOptions.customQuery)) {
      const customQuery = String(bondOptions.customQuery);
      if (/\s/.test(customQuery)) throw new Error('自定义键查询不能包含空格');
      changed.customQuery = customQuery;
      changed.type = Bond.PATTERN.TYPE.ANY;
      changed.topology = null;
      changed.reactingCenterStatus = null;
    }
    action.mergeWith(fromBondsAttrs(restruct, id, changed, false));
  });
  editor.update(action);
}

interface AppCallProps {
  checkServer: () => void;
  togglerComponent?: ReactElement;
}

const muiTheme = createTheme({
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});

type Props = AppCallProps;

const App = (props: Props) => {
  const dispatch = useAppDispatch();
  const { checkServer } = props;
  const snackbarNotificationText = useSelector(selectSnackbarNotificationText);

  // Enable bidirectional sync between Redux and Core settings
  // This ensures settings changes in macromolecules mode are reflected in small molecules mode
  useSettings();

  useSubscriptionOnEvents();
  const { ketcherId, prevKetcherId } = useAppContext();

  const handleCloseSnackbarNotification = useCallback(() => {
    dispatch({ type: 'HIDE_SNACKBAR_NOTIFICATION' });
  }, [dispatch]);

  // ChemWiki's external workbench hides Ketcher's native menus. Keep the
  // native property and structure-check dialogs available through a small
  // same-origin bridge so they use Ketcher's own forms and state handling.
  useEffect(() => {
    const handleExternalDialog = (event: Event) => {
      const detail = (event as CustomEvent<{ dialog?: unknown; handled?: boolean; error?: string }>).detail;
      const dialog = detail?.dialog;
      if (dialog === 'check') {
        openDialog(dispatch, 'check').catch(() => undefined);
        return;
      }
      if (dialog === 'attachData' || dialog === 'editAttachedData') {
        if (detail) detail.handled = true;
        try {
          const editor = ketcherProvider.getKetcher(ketcherId).editor as any;
          const target = prepareDataAttachment(editor, dialog === 'editAttachedData');
          editor.selection(target.selection);
          SGroupTool.sgroupDialog(editor, target.id, { dataOnly: true });
        } catch (error) {
          if (detail) detail.error = error instanceof Error ? error.message : String(error);
          KetcherLogger.error('ChemWiki Attach Data bridge', error);
        }
        return;
      }
      if (dialog !== 'bondProps' && dialog !== 'atomProps') return;

      try {
        const editor = ketcherProvider.getKetcher(ketcherId).editor as any;
        const selection = editor.selection?.() ?? {};
        const ids = dialog === 'bondProps' ? selection.bonds ?? [] : selection.atoms ?? [];
        const first = ids.length > 0
          ? (dialog === 'bondProps'
            ? editor.render?.ctab?.bonds?.get?.(ids[0])?.b
            : editor.render?.ctab?.atoms?.get?.(ids[0])?.a)
          : null;
        const initial = dialog === 'bondProps' ? fromBond(first) : fromAtom(first);
        if (!initial || ids.length === 0) return;

        openDialog(dispatch, dialog, initial)
          .then((result) => {
            const changed = dialog === 'bondProps'
              ? toBond(result as ReturnType<typeof fromBond>)
              : toAtom(result as any);
            if (!changed) return;
            const restruct = editor.render.ctab;
            const action = new Action();
            for (const id of ids) {
              const unchanged = dialog === 'bondProps'
                ? restruct.molecule.bonds.get(id)
                : restruct.molecule.atoms.get(id);
              if (!unchanged) continue;
              const merged = updateOnlyChangedProperties(unchanged, changed);
              action.mergeWith(dialog === 'bondProps'
                ? fromBondsAttrs(restruct, id, merged, false)
                : fromAtomsAttrs(restruct, id, merged, false));
            }
            editor.update(action);
          })
          .catch((error) => KetcherLogger.error('ChemWiki Bond Properties bridge', error));
      } catch (error) {
        KetcherLogger.error('ChemWiki Bond Properties bridge', error);
      }
    };

    const handleQueryOptions = (event: Event) => {
      try {
        const editor = ketcherProvider.getKetcher(ketcherId).editor as any;
        const detail = (event as CustomEvent<QueryStructureEventDetail>).detail || {};
        applyQueryStructureOptions(editor, detail.options || {});
      } catch (error) {
        const detail = (event as CustomEvent<QueryStructureEventDetail>).detail;
        if (detail) detail.error = error instanceof Error ? error.message : String(error);
        KetcherLogger.error('ChemWiki Query Structure Options bridge', error);
      }
    };

    window.addEventListener('chemwiki:open-ketcher-dialog', handleExternalDialog);
    window.addEventListener('chemwiki:apply-query-options', handleQueryOptions);
    return () => {
      window.removeEventListener('chemwiki:open-ketcher-dialog', handleExternalDialog);
      window.removeEventListener('chemwiki:apply-query-options', handleQueryOptions);
    };
  }, [dispatch, ketcherId]);

  useEffect(() => {
    checkServer();
    // TODO suppressed after upgrade to react 19. Need to fix
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    dispatch(initFGTemplates());
    // TODO suppressed after upgrade to react 19. Need to fix
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    dispatch(initSaltsAndSolventsTemplates());

    return () => {
      dispatch(initLib([]));
      dispatch(initSaltsAndSolvents([]));
      dispatch(initFGroups([]));
      // App component is unmounted after editor components (MicromoleculeEditor.tsx and ketcher-react/src/Editor.tsx)
      // due to asynchronous behaviour (see packages/ketcher-react/src/MicromoleculesEditor.tsx, appRootRef.current.unmount call).
      // In other hand we still ketcher instance in ketcherProvider for useSubscriptionOnEvents cleanup function.
      // So we need to remove ketcher instance from ketcherProvider here.
      // Ideally is to remove ketcher instance in cleanup function of the most parent component (MicromoleculesEditor, or Editor, depends on usage)
      ketcherProvider.removeKetcherInstance(ketcherId);
    };
  }, []);

  // Temporary workaround: add proper types for Editor
  const Editor = ConnectedEditor as React.ComponentType<{
    className: string;
    ketcherId: string;
    prevKetcherId: string;
  }>;

  return (
    <ThemeProvider theme={muiTheme}>
      <div className={classes.app}>
        <AppHiddenContainer />
        <Editor
          prevKetcherId={prevKetcherId}
          ketcherId={ketcherId}
          className={classes.canvas}
        />

        <TopToolbarContainer
          className={classes.top}
          togglerComponent={props.togglerComponent}
        />
        <LeftToolbarContainer className={classes.left} />
        <BottomToolbarContainer className={classes.bottom} />
        <RightToolbarContainer className={classes.right} />

        {
          // TODO suppressed after upgrade to react 19. Need to fix
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          <AppClipArea />
        }
        <AppModalContainer ketcherId={ketcherId} />
        <AbbreviationLookupContainer />
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          open={Boolean(snackbarNotificationText)}
          onClose={handleCloseSnackbarNotification}
          autoHideDuration={6000}
        >
          <div
            className={classes.toastNotification}
            data-testid="notification-banner"
          >
            <div className={classes.toastNotificationText}>
              {snackbarNotificationText}
            </div>
            <IconButton
              iconName="close"
              className={classes.toastNotificationCloseIcon}
              testId="notification-banner-close-button"
              onClick={handleCloseSnackbarNotification}
            />
          </div>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
};

export type { AppCallProps };
export { App };
