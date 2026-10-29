import { fireEvent, render, screen } from '@testing-library/react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import Text from './Text';

describe('windowed text dialog', () => {
  it('uses the window form when the legacy modal is null', () => {
    const store = createStore(() => ({ modal: null }));
    const onOk = jest.fn();

    render(
      <Provider store={store}>
        <Text
          content=""
          formState={{ errors: {}, result: {}, valid: true }}
          onCancel={jest.fn()}
          onOk={onOk}
        />
      </Provider>,
    );

    const confirmButton = screen.getByTestId('OK');
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);

    expect(onOk).toHaveBeenCalledWith({
      content: '',
      id: undefined,
      position: undefined,
    });
  });
});
