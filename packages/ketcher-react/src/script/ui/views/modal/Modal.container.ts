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

import { Modal, ModalProps } from './Modal';

import { BaseCallProps, ModalContainerProps } from './modal.types';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { omit } from 'lodash/fp';
import { WindowState } from '../../state/modal/windows';

interface WindowCallProps {
  onWindowClose: (id: string) => void;
  onBringToFront: (id: string) => void;
}

type StateProps = Pick<ModalProps, 'modal'> & {
  windows: WindowState[];
  windowedMode: boolean;
};

const mapStateToProps = (state): StateProps => ({
  modal: state.modal,
  windows: state.windows?.windows ?? [],
  windowedMode: state.options?.settings?.windowedMode ?? true,
});

const mapDispatchToProps = (
  dispatch: Dispatch,
): BaseCallProps & WindowCallProps => ({
  onOk: (_result) => {
    dispatch({ type: 'MODAL_CLOSE' });
  },
  onCancel: () => {
    dispatch({ type: 'MODAL_CLOSE' });
  },
  onWindowClose: (id: string) => {
    dispatch({ type: 'WINDOW_CLOSE', id });
  },
  onBringToFront: (id: string) => {
    dispatch({ type: 'WINDOW_BRING_TO_FRONT', id });
  },
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: BaseCallProps & WindowCallProps,
  ownProps: ModalContainerProps,
): ModalProps => {
  const prop = stateProps.modal?.prop;
  const initProps = prop ? omit(['onResult', 'onCancel'], prop) : {};
  return {
    modal: stateProps.modal,
    windows: stateProps.windows,
    windowedMode: stateProps.windowedMode,
    ...initProps,
    onOk: (result) => {
      prop?.onResult?.(result);
      dispatchProps.onOk(result);
    },
    onCancel: () => {
      prop?.onCancel?.();
      dispatchProps.onCancel();
    },
    onWindowClose: dispatchProps.onWindowClose,
    onBringToFront: dispatchProps.onBringToFront,
    ...ownProps,
  };
};

const ModalContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(Modal);

export default ModalContainer;
