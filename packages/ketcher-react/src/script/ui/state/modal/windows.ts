import { AnyAction } from 'redux';
import { formsState, type ModalFormState } from './form';

interface ModalDialogProps {
  onResult?: (value: unknown) => void;
  onCancel?: (reason?: unknown) => void;
  [key: string]: unknown;
}

export interface WindowState {
  id: string;
  name: string;
  form: ModalFormState | null;
  prop: ModalDialogProps | null;
  zIndex: number;
  initialOffset: { x: number; y: number };
}

export interface WindowsState {
  windows: WindowState[];
  nextZIndex: number;
}

const CASCADE_OFFSET = 30;
const BASE_Z_INDEX = 50;

const initialState: WindowsState = {
  windows: [],
  nextZIndex: BASE_Z_INDEX,
};

export default function windowsReducer(
  state: WindowsState = initialState,
  action: AnyAction,
): WindowsState {
  switch (action.type) {
    case 'WINDOW_OPEN': {
      const { data } = action;
      const windowCount = state.windows.length;
      const newWindow: WindowState = {
        id: `${data.name}-${Date.now()}`,
        name: data.name,
        form: formsState[data.name] || null,
        prop: data.prop || null,
        zIndex: state.nextZIndex,
        initialOffset: {
          x: windowCount * CASCADE_OFFSET,
          y: windowCount * CASCADE_OFFSET,
        },
      };
      return {
        windows: [...state.windows, newWindow],
        nextZIndex: state.nextZIndex + 1,
      };
    }

    case 'WINDOW_CLOSE': {
      const { id } = action;
      return {
        ...state,
        windows: state.windows.filter((w) => w.id !== id),
      };
    }

    case 'MODAL_CLOSE': {
      if (state.windows.length === 0) return state;
      const topWindow = state.windows.reduce((a, b) =>
        a.zIndex > b.zIndex ? a : b,
      );
      return {
        ...state,
        windows: state.windows.filter((w) => w.id !== topWindow.id),
      };
    }

    case 'WINDOW_BRING_TO_FRONT': {
      const { id } = action;
      const win = state.windows.find((w) => w.id === id);
      if (!win || win.zIndex === state.nextZIndex - 1) return state;
      return {
        nextZIndex: state.nextZIndex + 1,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, zIndex: state.nextZIndex } : w,
        ),
      };
    }

    case 'WINDOW_UPDATE_FORM':
    case 'UPDATE_FORM': {
      if (state.windows.length === 0) return state;
      const targetId =
        action.type === 'WINDOW_UPDATE_FORM'
          ? action.id
          : state.windows.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id;
      const { data } = action;
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id !== targetId) return w;
          const form = w.form || { errors: {}, valid: true, result: {} };
          return { ...w, form: { ...form, ...data } };
        }),
      };
    }

    default:
      return state;
  }
}
