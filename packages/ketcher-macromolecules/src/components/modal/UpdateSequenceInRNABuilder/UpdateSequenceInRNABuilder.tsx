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
import { Modal } from 'components/shared/modal';
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from 'hooks';
import { selectSequenceSelection } from 'state/rna-builder';
import { ActionButton } from 'components/shared/actionButton';
import styled from '@emotion/styled';
import { selectEditor } from 'state/common';
import { getCountOfNucleoelements } from 'helpers/countNucleoelents';
import { resetRnaBuilderAfterSequenceUpdate } from 'components/monomerLibrary/RnaBuilder/RnaEditor/RnaEditorExpanded/helpers';
import { i18n } from 'ketcher-react';

export interface Props {
  onClose: () => void;
  isModalOpen: boolean;
}

const TextWrapper = styled.div`
  padding: 12px;
`;

const UpdateSequenceInRNABuilder = ({ isModalOpen, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const sequenceSelection = useAppSelector(selectSequenceSelection);
  const editor = useAppSelector(selectEditor);
  const countOfNucleoelements = getCountOfNucleoelements(sequenceSelection);
  const onCloseCallback = useCallback(() => {
    onClose();
  }, [onClose]);

  const reset = () => {
    resetRnaBuilderAfterSequenceUpdate(dispatch, editor);
  };

  const cancelHandler = () => {
    onCloseCallback();
  };

  const updateHandler = () => {
    onCloseCallback();
    editor?.events.modifySequenceInRnaBuilder.dispatch(sequenceSelection);
    reset();
  };

  return (
    <Modal
      isOpen={isModalOpen}
      title={String(i18n.t('rnaBuilder.updateSequence'))}
      onClose={onCloseCallback}
      data-testid="update-sequence-modal"
    >
      <Modal.Content data-testid="update-sequence-modal-body">
        <TextWrapper>
          {String(i18n.t('rnaBuilder.updateSequenceConfirmPrefix'))}
          {countOfNucleoelements}
          {String(i18n.t('rnaBuilder.updateSequenceConfirmSuffix'))}
        </TextWrapper>
      </Modal.Content>
      <Modal.Footer>
        <ActionButton
          key="cancel"
          clickHandler={cancelHandler}
          label={String(i18n.t('dialog.cancel'))}
          styleType="secondary"
          title=""
          data-testid="update-sequence-cancel-button"
        />
        <ActionButton
          key="update"
          clickHandler={updateHandler}
          label={String(i18n.t('dialog.yes'))}
          title=""
          data-testid="update-sequence-yes-button"
        />
      </Modal.Footer>
    </Modal>
  );
};
export { UpdateSequenceInRNABuilder };
