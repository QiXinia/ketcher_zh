/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import {
  FC,
  PropsWithChildren,
  ReactElement,
  Ref,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

import clsx from 'clsx';
import { Icon } from '../Icon';
import styles from './Dialog.module.less';
import { KETCHER_ROOT_NODE_CSS_SELECTOR } from 'src/constants';
import { CLIP_AREA_BASE_CLASS } from '../../script/ui/component/cliparea/cliparea';
import { useDraggableDialog } from '../../hooks/useDraggableDialog';
import i18n from '../../i18n';

interface DialogParamsCallProps {
  onCancel: () => void;
  onOk: (result: unknown) => void;
}

export interface DialogParams extends DialogParamsCallProps {
  className?: string;
  isNestedModal?: boolean;
}

interface DialogProps {
  title?: string;
  params?: DialogParams;
  buttons?: Array<string | ReactElement>;
  className?: string;
  testId?: string;
  needMargin?: boolean;
  withDivider?: boolean;
  headerContent?: ReactElement;
  footerContent?: ReactElement;
  buttonsNameMap?: {
    [key in string]: string;
  };
  focusable?: boolean;
  primaryButtons?: string[];
  headerRef?: Ref<HTMLElement>;
  isDraggable?: boolean;
}

interface DialogCallProps {
  result?: () => unknown;
  valid?: () => boolean;
}

type Props = DialogProps & DialogCallProps;

export const Dialog: FC<PropsWithChildren & Props> = (props) => {
  const {
    children,
    title,
    params,
    result = () => null,
    valid = () => !!result(),
    buttons = ['OK'],
    headerContent,
    footerContent,
    className,
    testId: _testId,
    buttonsNameMap,
    needMargin = true,
    withDivider = false,
    focusable = true,
    primaryButtons,
    headerRef,
    isDraggable = false,
    ...rest
  } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const draggableCtx = useDraggableDialog();
  const effectiveIsDraggable = isDraggable || draggableCtx.isDraggable;
  const effectiveHeaderRef = headerRef || draggableCtx.headerRef;

  const getButtonLabel = (button: string): string => {
    const commonButtonsMap: Record<string, string> = {
      OK: i18n.t('dialog.ok'),
      Cancel: i18n.t('dialog.cancel'),
      Save: i18n.t('dialog.save'),
      Edit: i18n.t('dialog.edit'),
      Apply: i18n.t('dialog.apply'),
      Yes: i18n.t('dialog.yes'),
      Close: i18n.t('dialog.close'),
    };

    return buttonsNameMap?.[button] ?? commonButtonsMap[button] ?? button;
  };

  useLayoutEffect(() => {
    const dialogElement = dialogRef.current;

    // Use document.querySelector rather than dialogElement.closest() because
    // in popup mode the native <dialog> lives inside a MUI portal appended to
    // document.body — outside the .Ketcher-root subtree — so closest() returns
    // null and clipArea would be undefined.
    const clipArea = document.querySelector(
      `${KETCHER_ROOT_NODE_CSS_SELECTOR} .${CLIP_AREA_BASE_CLASS}`,
    ) as HTMLElement | null;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (focusable && dialogElement) {
      timeoutId = setTimeout(() => {
        (dialogElement as HTMLElement).focus();
      }, 0);
    }

    return () => {
      // Cancel the pending focus-on-open timeout so it cannot fire after
      // unmount and focus a detached element.
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      // Defer focus restoration so the browser can first move focus to
      // document.body naturally (when the <dialog> DOM node is removed).
      // That fires a native focusin on body which triggers MUI FocusTrap's
      // contain() with activeElement outside the trap, causing it to clear its
      // reactFocusEventTarget ref. If we focused clipArea synchronously here,
      // contain() would see focus is still inside the trap and short-circuit —
      // leaving reactFocusEventTarget pointing at the detached close button
      // (memory leak in popup mode).
      setTimeout(() => {
        clipArea?.focus();
      }, 0);
    };
  }, [focusable]);

  const isButtonOk = (button) => {
    return button === 'OK' || button === 'Save';
  };

  const isPrimary = (button) => {
    if (primaryButtons && primaryButtons.length > 0) {
      return primaryButtons.includes(button);
    }
    return isButtonOk(button);
  };

  const exit = (mode) => {
    const key = isButtonOk(mode) ? 'onOk' : 'onCancel';
    if (params && key in params && (key !== 'onOk' || valid())) {
      params[key](result());
    }
  };

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const isFocusInsideDialog = dialogRef.current?.contains(
        document.activeElement,
      );

      if (!isFocusInsideDialog) {
        return;
      }

      const { key } = event;
      const active = document.activeElement;
      const activeTextarea = active?.tagName === 'TEXTAREA';
      if (key === 'Escape' || (key === 'Enter' && !activeTextarea)) {
        exit(key === 'Enter' ? 'OK' : 'Cancel');
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', keyDown);

    return () => {
      document.removeEventListener('keydown', keyDown);
    };
  });

  return (
    <dialog
      ref={dialogRef}
      open
      data-testid={'info-modal-window'}
      tabIndex={-1}
      className={clsx(styles.dialog, className, params?.className)}
      {...rest}
    >
      <header
        ref={effectiveHeaderRef}
        className={clsx(
          styles.header,
          withDivider && styles.withDivider,
          effectiveIsDraggable && styles.draggable,
        )}
      >
        {headerContent || <span>{title}</span>}
        <div className={styles.btnContainer}>
          <button
            className={styles.buttonTop}
            onClick={() => exit('Cancel')}
            data-testid={'close-window-button'}
          >
            <Icon name={'close'} className={styles.closeButton} />
          </button>
        </div>
      </header>
      <div
        className={clsx(styles.body, needMargin && styles.withMargin)}
        data-testid={'info-modal-body'}
      >
        {children}
      </div>

      {(footerContent || buttons.length > 0) && (
        <footer className={styles.footer}>
          {footerContent}
          {buttons.length > 0 &&
            buttons.map((button) =>
              typeof button !== 'string' ? (
                button
              ) : (
                <input
                  key={button}
                  type="button"
                  className={clsx(
                    isPrimary(button) ? styles.ok : styles.cancel,
                    button === 'Save' && styles.save,
                  )}
                  value={getButtonLabel(button)}
                  disabled={isButtonOk(button) && !valid()}
                  onClick={() => exit(button)}
                  data-testid={button}
                />
              ),
            )}
        </footer>
      )}
    </dialog>
  );
};
