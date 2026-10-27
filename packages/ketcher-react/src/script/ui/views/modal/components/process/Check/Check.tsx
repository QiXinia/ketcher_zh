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

import { type ComponentType, type FC, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { Pile, type Struct } from 'ketcher-core';
import Form, {
  type FormState,
  Field,
} from '../../../../../component/form/form/form';
import { Dialog } from '../../../../components';
import ErrorsCheck from './components';
import { check } from '../../../../../state/server';
import type { MoleculeErrorLocations } from '../../../../../state/server/checkLocations';
import { checkOpts } from '../../../../../state/options';
import style from './Check.module.less';
import { LoadingCircles } from 'src/script/ui/views/components/Spinner';
import i18n from '../../../../../../../i18n';

interface MoleculeErrors {
  [key: string]: string;
}

type CheckOption =
  | 'valence'
  | 'radicals'
  | 'isotopes'
  | 'pseudoatoms'
  | 'stereo'
  | 'query'
  | 'overlapping_atoms'
  | 'overlapping_bonds'
  | 'rgroups'
  | 'chiral'
  | '3d'
  | 'chiral_flag';

interface CheckSchema {
  title: string;
  type: string;
  properties: {
    checkOptions: {
      title: string;
      type: string;
      items: {
        type: string;
        enum: CheckOption[];
        enumNames: string[];
      };
    };
  };
}

interface CheckState {
  checkOptions: CheckOption[];
  [key: string]: unknown;
}

interface CheckFormState extends FormState<CheckState> {
  moleculeErrors: MoleculeErrors;
  moleculeErrorLocations?: MoleculeErrorLocations;
}

interface CheckDialogOwnProps {
  onOk: (result: unknown) => void;
  onCancel: () => void;
}

interface CheckDialogStateProps {
  formState: CheckFormState;
  checkState: CheckState;
  editor: {
    selection: (selection: { atoms: number[]; bonds: number[] }) => unknown;
    struct: () => Struct;
    centerViewportAccordingToStruct: (struct: Struct) => unknown;
  };
}

interface CheckDialogDispatchProps {
  onCheck: (opts: CheckOption[]) => Promise<void>;
  onApply: (res: CheckState) => void;
}

type CheckDialogProps = CheckDialogOwnProps &
  CheckDialogStateProps &
  CheckDialogDispatchProps;

interface State {
  editor: CheckDialogStateProps['editor'];
  modal: {
    form: CheckFormState;
  };
  options: {
    check: CheckState;
  };
}

const checkSchema: CheckSchema = {
  title: i18n.t('check.title'),
  type: 'object',
  properties: {
    checkOptions: {
      title: i18n.t('check.settings'),
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'valence',
          'radicals',
          'isotopes',
          'pseudoatoms',
          'stereo',
          'chiral',
          'chiral_flag',
          'query',
          'overlapping_atoms',
          'overlapping_bonds',
          'rgroups',
          '3d',
        ],
        enumNames: [
          i18n.t('check.valence'),
          i18n.t('check.radical'),
          i18n.t('check.pseudoatom'),
          i18n.t('check.stereochemistry'),
          i18n.t('check.chirality'),
          i18n.t('check.chiralFlag'),
          i18n.t('check.query'),
          i18n.t('check.overlappingAtoms'),
          i18n.t('check.overlappingBonds'),
          i18n.t('check.rgroups'),
          i18n.t('check.structure3D'),
        ],
      },
    },
  },
};

const getFormattedDateString = (date: Date): string => {
  const getFixedString = (num: number): string => (num + '').padStart(2, '0');
  return `${getFixedString(date.getHours())}:${getFixedString(
    date.getMinutes(),
  )}:${getFixedString(date.getSeconds())}  ${getFixedString(
    date.getDate(),
  )}.${getFixedString(date.getMonth() + 1)}.${getFixedString(
    date.getFullYear(),
  )}`;
};

interface FooterContentProps {
  handleCheck: () => void;
  handleApply: () => void;
  onCancel: () => void;
  isStructureChecking: boolean;
  isCheckedWithNewSettings: boolean;
}

const FooterContent: FC<FooterContentProps> = ({
  handleCheck,
  handleApply,
  onCancel,
  isStructureChecking,
  isCheckedWithNewSettings,
}) => {
  return (
    <div className={style.buttons}>
      <div>
        <button
          className={
            isCheckedWithNewSettings
              ? style.buttonSecondary
              : style.buttonPrimary
          }
          onClick={handleCheck}
          disabled={!isStructureChecking}
          data-testid="Check"
        >
          {i18n.t('dialog.check')}
        </button>
      </div>
      <div className={style.buttonsRight}>
        <button
          className={style.buttonSecondary}
          onClick={onCancel}
          data-testid="Cancel"
        >
          {i18n.t('dialog.cancel')}
        </button>
        <button
          className={style.buttonPrimary}
          onClick={handleApply}
          disabled={!isStructureChecking}
          data-testid="Apply"
        >
          {i18n.t('dialog.apply')}
        </button>
      </div>
    </div>
  );
};

const CheckDialog: FC<CheckDialogProps> = (props) => {
  const {
    formState,
    checkState,
    editor,
    onCheck,
    onApply,
    onCancel,
    ...restProps
  } = props;
  const { result = checkState, moleculeErrors } = formState;
  const moleculeErrorLocations = formState.moleculeErrorLocations || {};
  const [isStructureChecking, setIsStructureChecking] = useState(false);
  const [lastCheckDate, setLastCheckDate] = useState<Date | null>(null);
  const [isCheckedWithNewSettings, setIsCheckedWithNewSettings] =
    useState(false);

  const handleApply = () => onApply(result);

  const handleCheck = () => {
    setIsStructureChecking(false);
    onCheck(result.checkOptions).then(() => {
      setIsStructureChecking(true);
      setLastCheckDate(new Date());
      setIsCheckedWithNewSettings(true);
    });
  };

  const handleSettingsChange = () => setIsCheckedWithNewSettings(false);

  const handleSelectWarningEntities = (
    warningAtomIds: number[],
    bondIds: number[],
  ) => {
    const bondLocations = bondIds
      .map((id) => editor.struct().bonds.get(id))
      .filter((bond) => bond !== undefined);
    const atomIds = Array.from(
      new Set([
        ...warningAtomIds,
        ...bondLocations.flatMap(({ begin, end }) => [begin, end]),
      ]),
    );
    if (!atomIds.length && !bondIds.length) return;
    const selectedAtoms = new Pile(atomIds);
    editor.selection({ atoms: atomIds, bonds: bondIds });
    editor.centerViewportAccordingToStruct(
      editor.struct().clone(selectedAtoms),
    );
    onCancel();
  };

  useEffect(() => {
    handleCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog
      title={i18n.t('check.title')}
      className={style.dialog_body}
      params={{ ...restProps, onCancel }}
      buttons={[]}
      footerContent={
        <FooterContent
          handleCheck={handleCheck}
          handleApply={handleApply}
          onCancel={onCancel}
          isStructureChecking={isStructureChecking}
          isCheckedWithNewSettings={isCheckedWithNewSettings}
        />
      }
      withDivider
    >
      <Form
        schema={checkSchema}
        init={checkState}
        {...formState}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - result prop is not in FormProps type definition but is accepted by the component
        result={result}
      >
        <div className={style.wrapper}>
          <div className={style.settings}>
            <span className={style.sectionTitle}>
              {i18n.t('check.settings')}
            </span>
            <div
              className={!isStructureChecking ? style.checkBoxesDisabled : ''}
            >
              <Field
                name="checkOptions"
                labelPos={false}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore - multiple and onChange props are not in FieldProps type definition but are accepted by the component
                multiple
                type="checkbox"
                disabled={!isStructureChecking}
                onChange={handleSettingsChange}
              />
            </div>
          </div>
          <div className={style.checkInfo}>
            <span data-testid={'checkInfo-lastCheck'}>
              {i18n.t('check.lastCheck')}
              {lastCheckDate && getFormattedDateString(lastCheckDate)}
            </span>
            <div
              className={
                !Object.keys(moleculeErrors).length || !isStructureChecking
                  ? style.centeredContainer
                  : style.warnings
              }
              data-testid={'checkInfo-messages'}
            >
              {isStructureChecking ? (
                <div
                  className={
                    Object.keys(moleculeErrors).length
                      ? style.warningsContainer
                      : style.centeredContainer
                  }
                >
                  <ErrorsCheck
                    moleculeErrors={moleculeErrors}
                    moleculeErrorLocations={moleculeErrorLocations}
                    checkSchema={checkSchema}
                    onSelectWarningEntities={handleSelectWarningEntities}
                  />
                </div>
              ) : (
                <LoadingCircles />
              )}
            </div>
          </div>
        </div>
      </Form>
    </Dialog>
  );
};

const mapStateToProps = (
  state: State,
  ownProps: any,
): CheckDialogStateProps => ({
  formState: ownProps.formState ?? state.modal?.form,
  checkState: state.options.check,
  editor: state.editor,
});

const mapDispatchToProps = (
  dispatch: ThunkDispatch<State, undefined, AnyAction>,
  ownProps: CheckDialogOwnProps,
): CheckDialogDispatchProps => ({
  onCheck: (opts: CheckOption[]) =>
    dispatch(check(opts)).catch(ownProps.onCancel),
  onApply: (res: CheckState) => {
    dispatch(checkOpts(res));
    ownProps.onOk(res);
  },
});

const ConnectedCheckDialog = connect(
  mapStateToProps,
  mapDispatchToProps,
)(CheckDialog);

export default ConnectedCheckDialog as ComponentType<CheckDialogOwnProps>;
