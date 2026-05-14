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
  type ComponentType,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dialog, LoadingCircles } from '../../../../components';
import {
  FormatterFactory,
  KetcherLogger,
  ketcherProvider,
  Struct,
  StructService,
  SupportedFormat,
} from 'ketcher-core';
import { MIEW_OPTIONS } from '../../../../../data/schema/options-schema';
import classes from './Miew.module.less';
import { connect } from 'react-redux';
import { load } from '../../../../../state';
import { pick } from 'lodash/fp';
import { Miew as MiewAsType } from 'miew';
import { createSelector } from 'reselect';
import { useAppContext } from 'src/hooks';
import i18n from '../../../../../../../i18n';
import { getElementDisplayTitle } from '../../../../../../../i18n/helpers';

const Viewer = lazy(() =>
  import('miew-react').then((module) => ({
    default: module.default as unknown as ComponentType<any>,
  })),
);

type MiewDialogProps = {
  miewOpts: any;
  server: StructService;
  struct: Struct;
  onCancel: () => void;
  onOk: (result: any) => void;
  miewTheme: 'dark' | 'light';
};
type MiewDialogCallProps = {
  onExportCML: (cmlStruct: string) => void;
};
type Props = MiewDialogProps & MiewDialogCallProps;

/* OPTIONS for MIEW */
const BACKGROUND_COLOR = {
  dark: '0x202020',
  light: '0xcccccc',
};

const MIEW_TX_TYPES = {
  no: null,
  bright: {
    colorer: 'EL',
  },
  blackAndWhite: {
    colorer: ['UN', { color: 0xffffff }],
    bg: '0x000',
  },
  black: {
    colorer: ['UN', { color: 0x000000 }],
  },
};

const TXoptions = (userOpts) => {
  const type = userOpts.miewAtomLabel;
  if (MIEW_TX_TYPES[type] === null) return null;
  return {
    colorer: MIEW_TX_TYPES[type].colorer,
    selector: 'not elem C',
    mode: [
      'TX',
      {
        bg: MIEW_TX_TYPES[type].bg || BACKGROUND_COLOR[userOpts.miewTheme],
        showBg: true,
        template: '{{elem}}',
      },
    ],
  };
};

function createMiewOptions(userOpts) {
  const options = {
    settings: {
      bg: { color: Number(BACKGROUND_COLOR[userOpts.miewTheme]) },
      autoPreset: false,
      editing: true,
      inversePanning: true,
    },
    reps: [
      {
        mode: userOpts.miewMode,
      },
    ],
  };

  const textMode = TXoptions(userOpts);
  if (textMode) options.reps.push(textMode);

  return options;
}
/* ---------------- */
type MiewVisualLike = {
  getSelectionCount: () => number;
};

type MiewXRSessionLike = {
  end?: () => Promise<void> | void;
};

type MiewRendererLike = {
  setAnimationLoop?: (callback: null) => void;
  dispose?: () => void;
  forceContextLoss?: () => void;
  renderLists?: {
    dispose?: () => void;
  };
  state?: {
    reset?: () => void;
  };
  info?: {
    reset?: () => void;
  };
  xr?: {
    enabled?: boolean;
    getSession?: () => MiewXRSessionLike | null;
  };
  domElement?: (HTMLCanvasElement & { remove?: () => void }) | null;
};

type MiewGfxLike = {
  renderer?: MiewRendererLike;
  renderer2d?: {
    reset?: () => void;
  };
};

type MiewResidueLike = {
  _chain?: {
    _name?: string;
  };
  _type?: {
    _name?: string;
  };
  _sequence?: number | string;
  _icode?: string | { trim?: () => string };
};

type MiewAtomLike = {
  element?: {
    name?: string;
    fullName?: string;
  };
  serial?: number | string;
  location?: number;
  residue?: MiewResidueLike;
  name?: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
};

type MiewPrivate = MiewAsType & {
  term: () => void;
  _msgMode?: HTMLElement;
  _msgAtomInfo?: HTMLElement;
  _lastPick?: MiewAtomLike & {
    _name?: string;
  };
  _gfx?: MiewGfxLike;
  _forEachComplexVisual?: (callback: (visual: MiewVisualLike) => void) => void;
  _setEditMode?: (mode: unknown) => unknown;
  _updateInfoPanel?: () => unknown;
  __ketcherI18nPatched?: boolean;
  __ketcherTermPatched?: boolean;
  __ketcherTerminated?: boolean;
};

const runCleanupStep = (callback?: () => unknown): void => {
  if (!callback) {
    return;
  }

  try {
    const result = callback();

    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      void (result as Promise<unknown>).catch(() => undefined);
    }
  } catch {
    // Ignore teardown failures so dialog closing is never blocked.
  }
};

const releaseMiewRenderer = (renderer?: MiewRendererLike): void => {
  if (!renderer) {
    return;
  }

  runCleanupStep(() => renderer.setAnimationLoop?.(null));
  runCleanupStep(() => renderer.xr?.getSession?.()?.end?.());

  if (renderer.xr) {
    renderer.xr.enabled = false;
  }

  runCleanupStep(() => renderer.renderLists?.dispose?.());
  runCleanupStep(() => renderer.state?.reset?.());
  runCleanupStep(() => renderer.info?.reset?.());
  runCleanupStep(() => renderer.dispose?.());
  runCleanupStep(() => renderer.forceContextLoss?.());

  const canvas = renderer.domElement;

  if (!canvas) {
    return;
  }

  canvas.width = 0;
  canvas.height = 0;
  runCleanupStep(() => canvas.remove?.());
};

const isActiveMiewInstance = (
  currentMiew: MiewAsType | undefined,
  targetMiew: MiewAsType,
): boolean => {
  return (
    currentMiew === targetMiew &&
    !(targetMiew as MiewPrivate).__ketcherTerminated
  );
};

const getTrimmedICode = (icode?: string | { trim?: () => string }): string => {
  if (typeof icode === 'string') {
    return icode.trim();
  }

  return icode?.trim?.() ?? '';
};

const isMiewAtom = (selection: unknown): selection is MiewAtomLike => {
  const atom = selection as MiewAtomLike | undefined;

  return Boolean(atom?.position && atom?.element && atom?.residue);
};

const splitParagraphLines = (paragraph: HTMLParagraphElement): string[] => {
  const lines: string[] = [];
  let currentLine = '';

  paragraph.childNodes.forEach((node) => {
    if (node.nodeName === 'BR') {
      lines.push(currentLine);
      currentLine = '';
      return;
    }

    currentLine += node.textContent ?? '';
  });

  lines.push(currentLine);

  return lines;
};

const setParagraphLines = (
  paragraph: HTMLParagraphElement,
  lines: string[],
): void => {
  while (paragraph.firstChild) {
    paragraph.removeChild(paragraph.firstChild);
  }

  lines.forEach((line, index) => {
    if (index > 0) {
      paragraph.appendChild(document.createElement('br'));
    }

    paragraph.appendChild(document.createTextNode(line));
  });
};

const getSelectionCount = (miew: MiewPrivate): number => {
  let count = 0;

  miew._forEachComplexVisual?.((visual) => {
    count += visual.getSelectionCount();
  });

  return count;
};

const getSelectionSummary = (count: number, hasLastPick: boolean): string => {
  const key =
    count === 1
      ? 'viewer3D.selectedAtomsSingular'
      : 'viewer3D.selectedAtomsPlural';
  let summary = String(i18n.t(key, { count }));

  if (hasLastPick) {
    summary += String(i18n.t('viewer3D.lastPickSuffix'));
  }

  return summary;
};

const getAtomSelectionLine = (atom: MiewAtomLike): string => {
  const residue = atom.residue;
  const location =
    typeof atom.location === 'number' && atom.location !== 32
      ? String.fromCharCode(atom.location)
      : '';
  const elementName = getElementDisplayTitle(
    atom.element?.name,
    atom.element?.fullName,
  );
  const chainName = residue?._chain?._name ?? '';
  const residueName = residue?._type?._name ?? '';
  const residueSequence = residue?._sequence ?? '';
  const insertionCode = getTrimmedICode(residue?._icode);

  return `${elementName} #${String(
    atom.serial ?? '',
  )}${location}: ${chainName}.${residueName}${String(
    residueSequence,
  )}${insertionCode}.${atom.name ?? ''}`;
};

const getCoordSelectionLine = (
  position: NonNullable<MiewAtomLike['position']>,
): string => {
  return `${String(i18n.t('viewer3D.coordLabel'))} (${position.x.toFixed(
    2,
  )}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
};

const localizeModeOverlay = (miew: MiewPrivate): void => {
  const paragraph = miew._msgMode?.getElementsByTagName('p')[0];

  if (!paragraph || !paragraph.textContent) {
    return;
  }

  if (paragraph.textContent === 'COMPONENT EDIT MODE') {
    paragraph.textContent = String(i18n.t('viewer3D.componentEditMode'));
  } else if (paragraph.textContent === 'FRAGMENT EDIT MODE') {
    paragraph.textContent = String(i18n.t('viewer3D.fragmentEditMode'));
  }
};

const localizeInfoOverlay = (miew: MiewPrivate): void => {
  const paragraph = miew._msgAtomInfo?.getElementsByTagName('p')[0];

  if (!paragraph) {
    return;
  }

  const count = getSelectionCount(miew);

  if (count === 0) {
    return;
  }

  const lines = splitParagraphLines(paragraph);
  const lastPick = miew._lastPick;

  lines[0] = getSelectionSummary(count, Boolean(lastPick));

  if (isMiewAtom(lastPick)) {
    lines[1] = getAtomSelectionLine(lastPick);
    if (lastPick.position) {
      lines[2] = getCoordSelectionLine(lastPick.position);
    }
  } else if (typeof lines[1] === 'string') {
    if (lines[1].startsWith('chain ')) {
      lines[1] = `${String(i18n.t('viewer3D.chainLabel'))} ${lines[1].slice(
        'chain '.length,
      )}`;
    } else if (lines[1].startsWith('molecule ')) {
      lines[1] = `${String(i18n.t('viewer3D.moleculeLabel'))} ${lines[1].slice(
        'molecule '.length,
      )}`;
    }
  }

  setParagraphLines(
    paragraph,
    lines.filter(
      (line): line is string => typeof line === 'string' && line.length > 0,
    ),
  );
};

const patchMiewLocalization = (miewInstance: MiewAsType): void => {
  const miew = miewInstance as MiewPrivate;

  if (!miew.__ketcherI18nPatched) {
    const originalSetEditMode = miew._setEditMode?.bind(miew);

    if (originalSetEditMode) {
      miew._setEditMode = (mode: unknown) => {
        const result = originalSetEditMode(mode);
        localizeModeOverlay(miew);
        return result;
      };
    }

    const originalUpdateInfoPanel = miew._updateInfoPanel?.bind(miew);

    if (originalUpdateInfoPanel) {
      miew._updateInfoPanel = () => {
        const result = originalUpdateInfoPanel();
        localizeInfoOverlay(miew);
        return result;
      };
    }

    miew.__ketcherI18nPatched = true;
  }

  localizeModeOverlay(miew);
  localizeInfoOverlay(miew);
};

const patchMiewTermination = (miewInstance: MiewAsType): void => {
  const miew = miewInstance as MiewPrivate;

  if (miew.__ketcherTermPatched) {
    return;
  }

  const originalTerm = miew.term.bind(miew);

  miew.term = () => {
    if (miew.__ketcherTerminated) {
      return;
    }

    miew.__ketcherTerminated = true;
    const renderer = miew._gfx?.renderer;

    try {
      originalTerm();
    } finally {
      runCleanupStep(() => miew._gfx?.renderer2d?.reset?.());
      releaseMiewRenderer(renderer);
    }
  };

  miew.__ketcherTermPatched = true;
};

const FooterContent = () => (
  <div className={classes.warning}>
    {i18n.t('viewer3D.strongRotationWarning')}
  </div>
);

const MiewDialog = ({
  miewOpts,
  server,
  struct,
  onExportCML,
  miewTheme = 'light',
  ...prop
}: Props) => {
  const miewRef = useRef<MiewAsType>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);
  const { ketcherId } = useAppContext();
  const ketcher = useMemo(
    () => ketcherProvider.getKetcher(ketcherId),
    [ketcherId],
  );

  const isDisabled = useMemo(() => {
    return (
      !isInitialized || ketcher?.editor.render.options.viewOnlyMode === true
    );
  }, [ketcher, isInitialized]);

  const onMiewInit = useCallback(
    (miew: MiewAsType) => {
      setIsInitialized(false);
      miewRef.current = miew;
      patchMiewTermination(miew);
      patchMiewLocalization(miew);
      const factory = new FormatterFactory(server);
      const service = factory.create(SupportedFormat.cml);

      service
        .getStringFromStructureAsync(struct)
        .then((res) => {
          if (!isActiveMiewInstance(miewRef.current, miew)) {
            return false;
          }

          return miew
            .load(res, { sourceType: 'immediate', fileType: 'cml' })
            .then(() => true);
        })
        .then((isLoaded) => {
          if (!isLoaded || !isActiveMiewInstance(miewRef.current, miew)) {
            return;
          }

          miew.setOptions(miewOpts);
          setIsInitialized(true);
        })
        .catch((e) => {
          if (!isActiveMiewInstance(miewRef.current, miew)) {
            return;
          }

          KetcherLogger.error('Miew.tsx::MiewDialog::onMiewInit', e);
        });
    },
    [miewOpts, server, struct],
  );

  useEffect(() => {
    return () => {
      const miew = miewRef.current as MiewPrivate | undefined;

      miew?.term?.();
      miewRef.current = undefined;
    };
  }, []);

  const exportCML = useCallback(() => {
    const cmlStruct = miewRef.current?.exportCML();
    if (!cmlStruct) {
      return;
    }
    onExportCML(cmlStruct);
  }, [onExportCML, miewRef]);

  return (
    <Dialog
      title={i18n.t('server.viewer3D')}
      needMargin={false}
      params={prop}
      buttons={[
        i18n.t('dialog.cancel'),
        <button
          key="apply"
          onClick={exportCML}
          className={classes.applyButton}
          disabled={isDisabled}
          data-testid="miew-modal-button"
        >
          {i18n.t('dialog.apply')}
        </button>,
      ]}
      footerContent={<FooterContent />}
      className={classes.miewDialog}
    >
      <div>
        <div
          className={`${classes.miewContainer} ${
            miewTheme === 'dark' ? classes.miewDarkTheme : ''
          }`}
        >
          <Suspense
            fallback={
              <div className={classes.loadingContainer}>
                <LoadingCircles />
              </div>
            }
          >
            <Viewer onInit={onMiewInit} />
          </Suspense>
        </div>
      </div>
    </Dialog>
  );
};

const getOptionsSettings = (state) => state.options.settings;
const miewOptionsSelector = createSelector([getOptionsSettings], (settings) =>
  createMiewOptions(pick(MIEW_OPTIONS, settings)),
);

const mapStateToProps = (state) => ({
  miewOpts: miewOptionsSelector(state),
  server: state.options.app.server ? state.server : null,
  struct: state.editor.struct(),
  miewTheme: state.options.settings.miewTheme,
});

const mapDispatchToProps = (dispatch) => ({
  onExportCML: (cmlStruct) => {
    dispatch(load(cmlStruct));
    // TODO: Removed ownProps.onOk call. consider refactoring of load function in release 2.4
    // See PR #731 (https://github.com/epam/ketcher/pull/731)
  },
});

const Miew = connect(mapStateToProps, mapDispatchToProps)(MiewDialog);

export default Miew;
