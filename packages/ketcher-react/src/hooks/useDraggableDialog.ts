import { createContext, RefObject, useContext } from 'react';

interface DraggableDialogContextValue {
  isDraggable: boolean;
  headerRef: RefObject<HTMLElement | null> | null;
}

const DraggableDialogContext = createContext<DraggableDialogContextValue>({
  isDraggable: false,
  headerRef: null,
});

export const DraggableDialogProvider = DraggableDialogContext.Provider;

export function useDraggableDialog(): DraggableDialogContextValue {
  return useContext(DraggableDialogContext);
}
