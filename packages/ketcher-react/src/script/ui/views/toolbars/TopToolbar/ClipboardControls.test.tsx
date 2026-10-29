import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { ClipboardControls } from './ClipboardControls';

it('offers labeled chemical formats in the copy dropdown and respects button state', () => {
  const onCopySmiles = jest.fn();
  const onCopyInchi = jest.fn();
  const noop = () => {};
  const store = createStore((state = {}) => state);
  render(
    <Provider store={store}>
      <ClipboardControls
        onCopy={noop}
        onCopyMol={noop}
        onCopyKet={noop}
        onCopyImage={noop}
        onCopySmiles={onCopySmiles}
        onCopyInchi={onCopyInchi}
        onCopyInchiKey={noop}
        onCopyCdxml={noop}
        onPaste={noop}
        onCut={noop}
        disabledButtons={['copy-inchi']}
        hiddenButtons={['copy-cdxml']}
        shortcuts={{}}
      />
    </Provider>,
  );
  fireEvent.click(screen.getByTestId('copy-button-dropdown-triangle'));
  fireEvent.click(screen.getByTestId('copy-smiles-button'));
  expect(onCopySmiles).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('copy-inchi-button')).toBeDisabled();
  expect(onCopyInchi).not.toHaveBeenCalled();
  expect(screen.queryByTestId('copy-cdxml-button')).toBeNull();
});
