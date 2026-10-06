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
import {
  createNewPreset,
  deletePreset,
  selectActivePresetForContextMenu,
  setIsEditMode,
} from 'state/rna-builder';
import { StyledActionButton } from 'components/modal/Delete/styledComponents';
import styled from '@emotion/styled';
import { selectEditor } from 'state/common';
import { i18n } from 'ketcher-react';

export interface Props {
  onClose: () => void;
  isModalOpen: boolean;
}

const DeleteTextWrapper = styled.div`
  padding: 12px;
`;

const Delete = ({ isModalOpen, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const activePresetForContextMenu = useAppSelector(
    selectActivePresetForContextMenu,
  );
  const editor = useAppSelector(selectEditor);
  const onCloseCallback = useCallback(() => {
    onClose();
  }, [onClose]);

  const cancelHandler = () => {
    onCloseCallback();
  };

  const deleteHandler = () => {
    onCloseCallback();
    dispatch(deletePreset(activePresetForContextMenu));
    dispatch(setIsEditMode(false));
    dispatch(createNewPreset());
    editor?.events.selectPreset.dispatch(null);
  };

  return (
    <Modal
      isOpen={isModalOpen}
      title={i18n.t('macromolecules.deleteRnaPreset')}
      onClose={onCloseCallback}
      data-testid="delete-preset-modal"
    >
      <Modal.Content>
        <DeleteTextWrapper data-testid="delete-preset-popup-content">
          <div>{i18n.t('macromolecules.deleteRnaPresetAbout')}</div>
          <div>
            {i18n.t('macromolecules.deleteRnaPresetName', {
              name: activePresetForContextMenu.name,
            })}
          </div>
          <div>{i18n.t('macromolecules.deleteRnaPresetUndo')}</div>
        </DeleteTextWrapper>
      </Modal.Content>
      <Modal.Footer>
        <StyledActionButton
          key="cancel"
          clickHandler={cancelHandler}
          label={i18n.t('dialog.cancel')}
          styleType="secondary"
          data-testid="cancel-delete-preset-button"
        />
        <StyledActionButton
          key="delete"
          clickHandler={deleteHandler}
          label={i18n.t('contextMenu.delete')}
          data-testid="delete-preset-button"
        />
      </Modal.Footer>
    </Modal>
  );
};
export { Delete };
