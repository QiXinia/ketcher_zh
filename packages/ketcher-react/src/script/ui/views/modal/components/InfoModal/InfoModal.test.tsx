import { screen } from '@testing-library/react';
import InfoModal from './InfoModal';
import { shortcut } from './constants';
import { renderWithMockStore } from './InfoModal.test.utils';
import i18n from '../../../../../../i18n';
import config from 'src/script/ui/action';

describe('InfoModal should be rendered correctly', () => {
  it('should render default error message for Cut and Copy actions', () => {
    const props = 'Cut';
    const defaultErrorText = i18n.t('infoModal.unavailableViaMenu', {
      action: props,
    });
    const view = renderWithMockStore(<InfoModal message={props} />);

    expect(view).toMatchSnapshot();
    expect(screen.getByText(defaultErrorText)).toBeInTheDocument();
  });

  it('should render Paste shortcut message if Paste message dispatched to props', () => {
    const props = config.paste.title ?? i18n.t('action.paste');
    const view = renderWithMockStore(<InfoModal message={props} />);
    expect(view).toMatchSnapshot();
    expect(screen.getByText(shortcut.hotKey)).toBeInTheDocument();
  });
});
