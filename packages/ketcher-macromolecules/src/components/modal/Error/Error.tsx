import { ActionButton } from 'components/shared/actionButton';
import { Modal } from 'components/shared/modal';
import { useAppDispatch, useAppSelector } from 'hooks';
import {
  closeErrorModal,
  selectErrorModalText,
  selectErrorModalTitle,
} from 'state/modal';
import { i18n, translateErrorMessage } from 'ketcher-react';
import { ErrorTextWrapper } from './Error.styles';

export const ErrorModal = () => {
  const dispatch = useAppDispatch();
  const errorMessage = useAppSelector(selectErrorModalText);
  const errorTitle =
    useAppSelector(selectErrorModalTitle) ||
    String(i18n.t('infoModal.errorMessage'));
  const isModalOpen = errorMessage !== '';
  const onClose = () => {
    dispatch(closeErrorModal());
  };
  return (
    <Modal
      isOpen={isModalOpen}
      title={errorTitle}
      onClose={onClose}
      testId="info-modal-window"
    >
      <Modal.Content>
        <ErrorTextWrapper data-testid="error-message-body">
          {translateErrorMessage(errorMessage)}
        </ErrorTextWrapper>
      </Modal.Content>
      <Modal.Footer>
        <ActionButton
          label={String(i18n.t('infoModal.close'))}
          clickHandler={onClose}
          data-testid="info-modal-close"
        />
      </Modal.Footer>
    </Modal>
  );
};
