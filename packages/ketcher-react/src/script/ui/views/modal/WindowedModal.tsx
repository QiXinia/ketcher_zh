import { useRef, FC } from 'react';
import { omit } from 'lodash/fp';
import clsx from 'clsx';
import modals from '../../dialog';
import { useDraggable } from 'src/hooks/useDraggable';
import { DraggableDialogProvider } from 'src/hooks/useDraggableDialog';
import { WindowState } from '../../state/modal/windows';
import classes from './WindowedModal.module.less';
import selectClasses from '../../component/form/Select/Select.module.less';

interface WindowedModalProps {
  windows: WindowState[];
  onWindowClose: (id: string) => void;
  onBringToFront: (id: string) => void;
  ketcherId?: string;
}

interface DraggableWindowWrapperProps {
  window: WindowState;
  onBringToFront: () => void;
  onOk: (result: any) => void;
  onCancel: () => void;
  ketcherId?: string;
}

const DraggableWindowWrapper: FC<DraggableWindowWrapperProps> = ({
  window: win,
  onBringToFront,
  onOk,
  onCancel,
  ketcherId,
}) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const { position, isDragging } = useDraggable({
    handleRef: headerRef,
    targetRef,
    enabled: true,
    onDragStart: onBringToFront,
  });

  const Component = modals[win.name];
  if (!Component) return null;

  const initProps = win.prop ? omit(['onResult', 'onCancel'], win.prop) : {};

  return (
    <div
      ref={targetRef}
      className={clsx(classes.draggableWindow, isDragging && classes.dragging)}
      style={{
        zIndex: win.zIndex,
        transform: `translate(calc(-50% + ${
          position.x + win.initialOffset.x
        }px), calc(-50% + ${position.y + win.initialOffset.y}px))`,
      }}
      onPointerDown={onBringToFront}
    >
      <DraggableDialogProvider value={{ isDraggable: true, headerRef }}>
        <div className={selectClasses.selectContainer}>
          <Component
            {...initProps}
            formState={win.form}
            onOk={onOk}
            onCancel={onCancel}
            ketcherId={ketcherId}
          />
        </div>
      </DraggableDialogProvider>
    </div>
  );
};

const WindowedModal: FC<WindowedModalProps> = ({
  windows,
  onWindowClose,
  onBringToFront,
  ketcherId,
}) => {
  if (windows.length === 0) return null;

  return (
    <div className={classes.windowedContainer}>
      {windows.map((win) => (
        <DraggableWindowWrapper
          key={win.id}
          window={win}
          onBringToFront={() => onBringToFront(win.id)}
          onOk={(result) => {
            win.prop?.onResult?.(result);
            onWindowClose(win.id);
          }}
          onCancel={() => {
            win.prop?.onCancel?.();
            onWindowClose(win.id);
          }}
          ketcherId={ketcherId}
        />
      ))}
    </div>
  );
};

export { WindowedModal };
