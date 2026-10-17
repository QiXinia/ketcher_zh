import { fireEvent, render, screen } from '@testing-library/react';
import InfoModal from './InfoModal';

describe('shared error modal', () => {
  const originalShowModal = HTMLDialogElement.prototype.showModal;
  const originalClose = HTMLDialogElement.prototype.close;
  const showModal = jest.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  const closeDialog = jest.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = showModal;
    HTMLDialogElement.prototype.close = closeDialog;
  });

  afterAll(() => {
    HTMLDialogElement.prototype.showModal = originalShowModal;
    HTMLDialogElement.prototype.close = originalClose;
  });

  it('renders localized labels and translates a known core error', () => {
    const close = jest.fn();
    render(<InfoModal message="Cannot export image" close={close} />);
    expect(screen.getByText('错误信息')).toBeInTheDocument();
    expect(screen.getByText('无法导出图片')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('preserves unknown runtime diagnostics', () => {
    render(<InfoModal message="upstream details: 503" close={jest.fn()} />);
    expect(screen.getByText('upstream details: 503')).toBeInTheDocument();
  });
});
