import { ConfirmationDialogProps } from 'components/modal/modalContainer';
import { Modal } from 'components/shared/modal';
import { ActionButton } from 'components/shared/actionButton';
import { ConfirmationText } from './ConfirmationDialog.styles';
import { i18n } from 'ketcher-react';

export const ConfirmationDialog = ({
  title,
  confirmationText,
  onConfirm,
  isModalOpen,
  onClose,
}: ConfirmationDialogProps) => {
  const handleConfirm = () => {
    onConfirm!();
    onClose();
  };

  return (
    <Modal
      isOpen={isModalOpen}
      title={title ?? String(i18n.t('dialog.confirmAction'))}
      onClose={onClose}
      testId="confirmation-dialog"
    >
      <Modal.Content>
        <ConfirmationText data-testid="confirmation-text">
          {confirmationText}
        </ConfirmationText>
      </Modal.Content>
      <Modal.Footer>
        <ActionButton
          label={String(i18n.t('dialog.cancel'))}
          clickHandler={onClose}
          data-testid="cancel-button"
        />
        <ActionButton
          label={String(i18n.t('dialog.yes'))}
          clickHandler={handleConfirm}
          styleType="secondary"
          data-testid="yes-button"
        />
      </Modal.Footer>
    </Modal>
  );
};
