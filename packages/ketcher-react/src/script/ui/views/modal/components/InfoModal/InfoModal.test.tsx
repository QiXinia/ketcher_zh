import { screen } from '@testing-library/react';
import InfoModal from './InfoModal';
import { shortcut } from './constants';
import { renderWithMockStore } from './InfoModal.test.utils';
import i18n from '../../../../../../i18n';

describe('InfoModal should be rendered correctly', () => {
  it('should render default error message for Cut and Copy actions', () => {
    const props = 'Cut';
    const defaultErrorText = i18n.t(
      'dialogs:infoModal.defaultCutCopyMessage',
      { command: props },
    );
    const view = renderWithMockStore(<InfoModal message={props} />);

    expect(view).toMatchSnapshot();
    expect(screen.getByText(defaultErrorText)).toBeInTheDocument();
  });

  it('should render Paste shortcut message if Paste message dispatched to props', () => {
    // openInfoModal dispatches the stable action id, not the localized title.
    const props = 'Paste';
    const view = renderWithMockStore(<InfoModal message={props} />);
    expect(view).toMatchSnapshot();
    expect(screen.getByText(shortcut.hotKey)).toBeInTheDocument();
  });

  it('should translate custom core error titles and messages', () => {
    renderWithMockStore(
      <InfoModal title="Error" customText="Cannot export image" />,
    );
    expect(screen.getByText('错误')).toBeInTheDocument();
    expect(screen.getByText('无法导出图片')).toBeInTheDocument();
    expect(screen.getByText('关闭')).toBeInTheDocument();
  });

  it('should keep unknown diagnostics and custom JSX content', () => {
    renderWithMockStore(
      <InfoModal
        title="Service failure: 503"
        customText={<span>upstream details</span>}
      />,
    );
    expect(screen.getByText('Service failure: 503')).toBeInTheDocument();
    expect(screen.getByText('upstream details')).toBeInTheDocument();
  });
});
