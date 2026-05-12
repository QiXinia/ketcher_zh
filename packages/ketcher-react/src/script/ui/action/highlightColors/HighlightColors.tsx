import { FC } from 'react';
import { Icon } from 'components';
import {
  ColorContainer,
  ColorItem,
  ColorSquare,
  Divider,
  standardColors,
} from './style';
import { Item, Submenu } from 'react-contexify';
import i18n from '../../../../i18n';

interface HighlightMenuProps {
  onHighlight: (color: string) => void;
  disabled?: boolean;
}

const HighlightMenu: FC<HighlightMenuProps> = ({ onHighlight, disabled }) => {
  return (
    <Submenu
      data-testid="Highlight-option"
      label={i18n.t('contextMenu.highlight')}
      disabled={disabled}
    >
      <ColorContainer>
        {standardColors.map((color) => (
          <ColorItem
            key={color.name}
            data-testid={`${color.name}-option`}
            onClick={() => onHighlight(color.value)}
          >
            <ColorSquare color={color.value} />
          </ColorItem>
        ))}
      </ColorContainer>
      <Divider />
      <Item data-testid="No highlight-option" onClick={() => onHighlight('')}>
        <div
          style={{
            marginLeft: '-10px',
          }}
        >
          <Icon name="no-highlight-cross" />
          <span style={{ marginLeft: '10px' }}>
            {i18n.t('contextMenu.noHighlight')}
          </span>
        </div>
      </Item>
    </Submenu>
  );
};

export default HighlightMenu;
