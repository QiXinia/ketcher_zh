import { fireEvent, render, screen } from '@testing-library/react';
import { ZoomControls } from './ZoomControls';

jest.mock('components', () => ({ Icon: () => <span /> }));
jest.mock('./ZoomInput', () => ({
  ZoomInput: () => <input aria-label="zoom input" />,
  updateInputString: jest.fn(),
}));
jest.mock('../../../../../i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

describe('zoom controls', () => {
  const props = {
    currentZoom: 100,
    onZoom: jest.fn(),
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onZoomFit: jest.fn(),
    disabledButtons: [],
    hiddenButtons: [],
    shortcuts: {},
  };

  it('calls fit from the zoom menu', () => {
    render(<ZoomControls {...props} />);
    fireEvent.click(screen.getByTestId('zoom-selector'));
    fireEvent.click(screen.getByTestId('zoom-fit'));
    expect(props.onZoomFit).toHaveBeenCalledTimes(1);
  });

  it('respects host visibility and disabled settings', () => {
    const { unmount } = render(
      <ZoomControls {...props} disabledButtons={['zoom-fit']} />,
    );
    fireEvent.click(screen.getByTestId('zoom-selector'));
    expect(screen.getByTestId('zoom-fit')).toBeDisabled();
    unmount();
    render(<ZoomControls {...props} hiddenButtons={['zoom-fit']} />);
    fireEvent.click(screen.getByTestId('zoom-selector'));
    expect(screen.queryByTestId('zoom-fit')).toBeNull();
  });
});
