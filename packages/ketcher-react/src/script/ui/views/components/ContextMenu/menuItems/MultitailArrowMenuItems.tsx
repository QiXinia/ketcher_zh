import { Item } from 'react-contexify';
import i18n from '../../../../../../i18n';
import {
  useMultitailArrowTailsAdd,
  useMultitailArrowTailsRemove,
} from '../hooks/useMultitailArrowTails';
import {
  MenuItemsProps,
  MultitailArrowContextMenuProps,
} from '../contextMenu.types';

export function MultitailArrowMenuItems(
  props: Readonly<MenuItemsProps<MultitailArrowContextMenuProps>>,
) {
  const { addTail, isAddTailDisabled } = useMultitailArrowTailsAdd();
  const { removeTail, removeTailHidden } = useMultitailArrowTailsRemove();
  return (
    <>
      <Item
        {...props}
        data-testid="Remove tail-option"
        onClick={removeTail}
        hidden={removeTailHidden}
      >
        {i18n.t('contextMenu.removeTail')}
      </Item>
      <Item
        {...props}
        data-testid="Add new tail-option"
        onClick={addTail}
        disabled={isAddTailDisabled}
      >
        {i18n.t('contextMenu.addNewTail')}
      </Item>
    </>
  );
}
