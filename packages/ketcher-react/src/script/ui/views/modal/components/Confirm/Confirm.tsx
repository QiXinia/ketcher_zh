import i18n from '../../../../../../i18n';
import classes from '../toolbox/FG/RemoveFG.module.less';

type ConfirmProps = {
  onOk: () => void;
  onCancel: () => void;
};

export const Confirm = ({ onOk, onCancel }: ConfirmProps) => {
  return (
    <div className={classes.window}>
      <header className={classes.header} data-testid="confirm-header">
        {i18n.t('confirm.warning')}
      </header>
      <div className={classes.question} data-testid="confirm-question">
        {i18n.t('confirm.unsupportedSgroup')}
      </div>
      <footer className={classes.footer}>
        <input
          type="button"
          value={i18n.t('dialog.cancel')}
          className={classes.buttonCancel}
          onClick={() => onCancel()}
          data-testid="cancel-button"
        />
        <input
          type="button"
          value={i18n.t('dialog.ok')}
          className={classes.buttonOk}
          onClick={() => onOk()}
          data-testid="ok-button"
        />
      </footer>
    </div>
  );
};
