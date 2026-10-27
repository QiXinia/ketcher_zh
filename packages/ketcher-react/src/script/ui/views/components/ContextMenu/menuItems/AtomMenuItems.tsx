import type { FC } from 'react';
import { Item, Submenu } from 'react-contexify';
import MenuSeparator from '../MenuSeparator';
import useAtomEdit from '../hooks/useAtomEdit';
import useAtomStereo from '../hooks/useAtomStereo';
import useDelete from '../hooks/useDelete';
import useMarkAs from '../hooks/useMarkAs';
import type {
  AtomContextMenuProps,
  MenuItemsProps,
} from '../contextMenu.types';
import { updateSelectedAtoms } from 'src/script/ui/state/modal/atoms';
import { useAppContext } from 'src/hooks';
import type Editor from 'src/script/editor';
import ButtonGroup from '../../../../../../components/ToggleButtonGroup/ToggleButtonGroup';
import {
  type AtomAttributeName,
  type AtomAllAttributeValue,
  type AtomQueryPropertiesName,
  type AtomQueryProperties,
  type AtomAllAttributeName,
  atomGetAttr,
  Atom,
  ketcherProvider,
} from 'ketcher-core';
import { atom } from '../../../../data/schema/struct-schema';
import styles from '../ContextMenu.module.less';
import HighlightMenu from 'src/script/ui/action/highlightColors/HighlightColors';
import { Icon } from 'components';
import useMakeAttachmentPointMenuItems from '../hooks/useMakeAttachmentPointMenuItems';
import clsx from 'clsx';
import i18n from '../../../../../../i18n';

const {
  ringBondCount,
  hCount,
  substitutionQueryMode,
  unsaturatedAtom,
  implicitHCount,
} = atom.properties;
const properties: Array<AtomQueryPropertiesName> = [
  'aromaticity',
  'ringMembership',
  'ringSize',
  'connectivity',
  'chirality',
];

const atomPropertiesForSubMenu: {
  title: string;
  key: AtomAllAttributeName;
  buttons: { label: string; value: AtomAllAttributeValue }[];
}[] = [
  {
    title: ringBondCount.title,
    key: 'ringBondCount',
    buttons:
      ringBondCount.enumNames?.map((label, id) => ({
        label,
        value: ringBondCount.enum?.[id] as AtomAllAttributeValue,
      })) ?? [],
  },
  {
    title: hCount.title,
    key: 'hCount',
    buttons:
      hCount.enumNames?.map((label, id) => ({
        label,
        value: hCount.enum?.[id] as AtomAllAttributeValue,
      })) ?? [],
  },
  {
    title: unsaturatedAtom.title,
    key: 'unsaturatedAtom',
    buttons: [
      { label: i18n.t('contextMenu.unsaturated'), value: 1 },
      { label: i18n.t('contextMenu.saturated'), value: 0 },
    ],
  },
  {
    title: implicitHCount.title,
    key: 'implicitHCount',
    buttons:
      implicitHCount.enumNames?.map((label, id) => ({
        label,
        value: implicitHCount.enum?.[id] as AtomAllAttributeValue,
      })) ?? [],
  },
  ...properties.map((name) => ({
    title: atom.properties[name].title,
    key: name,
    buttons:
      atom.properties[name].enumNames?.map((label: string, id: number) => ({
        label,
        value: atom.properties[name].enum?.[id] as AtomAllAttributeValue,
      })) ?? [],
  })),
];

type SubstitutionChoice = {
  label: string;
  mode: 'free-sites' | 'up-to' | 'exactly' | null;
  count: 0 | 1 | 2 | 3 | 4;
};

const substitutionChoices: SubstitutionChoice[] = [
  { label: substitutionQueryMode.enumNames?.[0] ?? 'Unspecified', mode: null, count: 0 },
  ...(['free-sites', 'up-to', 'exactly'] as const).flatMap((mode, modeIndex) =>
    ([0, 1, 2, 3, 4] as const).map((count) => ({
      label: `${substitutionQueryMode.enumNames?.[modeIndex + 1] ?? mode} ${count}`,
      mode,
      count,
    })),
  ),
];

const AtomMenuItems: FC<MenuItemsProps<AtomContextMenuProps>> = (props) => {
  const [handleEdit] = useAtomEdit();
  const [handleStereo, stereoDisabled] = useAtomStereo();
  const handleDelete = useDelete();
  const {
    handler: handleMarkAs,
    isVisible: markAsIsVisible,
    isDisabled: markAsIsDisabled,
  } = useMarkAs();
  const { ketcherId } = useAppContext();
  const ketcher = ketcherProvider.getKetcher(ketcherId);
  const editor = ketcher.editor as Editor;
  const struct = editor.struct();

  const getPropertyValue = (key: AtomAllAttributeName) => {
    const { ctab } = editor.render;
    if (props.propsFromTrigger?.atomIds) {
      const atomId = props.propsFromTrigger?.atomIds[0] as number;
      if (properties.includes(key as AtomQueryPropertiesName)) {
        return atomGetAttr(ctab, atomId, 'queryProperties')?.[key];
      } else {
        return atomGetAttr(ctab, atomId, key as AtomAttributeName);
      }
    } else return null;
  };

  const updateAtomProperty = (
    key: AtomAllAttributeName,
    value: AtomAllAttributeValue,
  ) => {
    const atomIds = props.propsFromTrigger?.atomIds;
    if (atomIds) {
      updateSelectedAtoms({
        atoms: atomIds,
        editor,
        changeAtomPromise: Promise.resolve(
          properties.includes(key as AtomQueryPropertiesName)
            ? ({
                queryProperties: {
                  [key]: value,
                },
              } as AtomQueryProperties)
            : { [key]: value },
        ),
      });
    }
  };

  const updateSubstitutionQuery = (choice: SubstitutionChoice) => {
    const atomIds = props.propsFromTrigger?.atomIds;
    if (!atomIds) return;
    updateSelectedAtoms({
      atoms: atomIds,
      editor,
      changeAtomPromise: Promise.resolve({
        substitutionCount: 0,
        queryProperties: {
          substitutionQuery: choice.mode
            ? { mode: choice.mode, count: choice.count }
            : null,
        },
      } as AtomQueryProperties),
    });
  };

  const onlyOneAtomSelected = props.propsFromTrigger?.atomIds?.length === 1;
  const selectedAtomId = props.propsFromTrigger?.atomIds?.[0];
  const isAtomSuperatomLeavingGroup = Atom.isSuperatomLeavingGroupAtom(
    struct,
    selectedAtomId,
  );

  const highlightAtomWithColor = (color: string) => {
    const atomIds = props.propsFromTrigger?.atomIds || [];
    editor.highlights.create({
      atoms: atomIds,
      rgroupAttachmentPoints: [],
      bonds: [],
      color: color === '' ? 'transparent' : color,
    });
  };

  const makeAttachmentPointMenuItems = useMakeAttachmentPointMenuItems({
    props,
    selectedAtomId,
    editor,
  });

  if (isAtomSuperatomLeavingGroup && onlyOneAtomSelected) {
    return (
      <>
        <HighlightMenu onHighlight={highlightAtomWithColor} />
        <MenuSeparator />
        <Item {...props} data-testid="Delete-option" onClick={handleDelete}>
          <Icon name="deleteMenu" className={styles.icon} />
          <span className={styles.contextMenuText}>
            {i18n.t('contextMenu.delete')}
          </span>
        </Item>
      </>
    );
  }

  const editMenuItemTitle = props.propsFromTrigger?.extraItemsSelected
    ? i18n.t('contextMenu.editSelectedAtoms')
    : i18n.t('contextMenu.edit');

  const disabledForMonomerCreation = editor.isMonomerCreationWizardActive;
  const showMarkAsMenu = markAsIsVisible();
  const markAsDisabled = markAsIsDisabled();

  return (
    <>
      {showMarkAsMenu && (
        <Submenu
          {...props}
          data-testid="Mark as a...-option"
          label={i18n.t('contextMenu.markAs')}
          disabled={markAsDisabled}
          className={styles.subMenu}
        >
          <Item
            {...props}
            data-testid="Mark as Base-option"
            onClick={handleMarkAs('base')}
          >
            <Icon
              name="base"
              className={clsx(styles.icon, styles.markAsComponentIcon)}
            />
            <span>{i18n.t('contextMenu.base')}</span>
          </Item>
          <Item
            {...props}
            data-testid="Mark as Sugar-option"
            onClick={handleMarkAs('sugar')}
          >
            <Icon
              name="sugar"
              className={clsx(styles.icon, styles.markAsComponentIcon)}
            />
            <span>{i18n.t('contextMenu.sugar')}</span>
          </Item>
          <Item
            {...props}
            data-testid="Mark as Phosphate-option"
            onClick={handleMarkAs('phosphate')}
          >
            <Icon
              name="phosphate"
              className={clsx(styles.icon, styles.markAsComponentIcon)}
            />
            <span>{i18n.t('contextMenu.phosphate')}</span>
          </Item>
        </Submenu>
      )}
      {makeAttachmentPointMenuItems && (
        <>
          {makeAttachmentPointMenuItems}
          <MenuSeparator />
        </>
      )}
      <Item
        {...props}
        data-testid={editMenuItemTitle.concat('-option')}
        onClick={handleEdit}
      >
        <Icon name="editMenu" className={styles.icon} />
        <span className={styles.contextMenuText}>{editMenuItemTitle}</span>
      </Item>
      <Item
        {...props}
        data-testid="Enhanced stereochemistry...-option"
        disabled={stereoDisabled}
        onClick={handleStereo}
      >
        {i18n.t('contextMenu.enhancedStereochemistry')}
      </Item>
      <Submenu
        {...props}
        label={i18n.t('contextMenu.queryProperties')}
        data-testid="Query properties-option"
        style={{ overflow: 'visible' }}
        disabled={disabledForMonomerCreation}
      >
        <Submenu
          {...props}
          label={substitutionQueryMode.title}
          data-testid={`${substitutionQueryMode.title}-option`}
          className={styles.sameGroup}
        >
          {substitutionChoices.map((choice) => (
            <Item
              {...props}
              key={`${choice.mode ?? 'unspecified'}-${choice.count}`}
              data-testid={`${choice.label}-option`}
              onClick={() => updateSubstitutionQuery(choice)}
            >
              <span className={styles.contextMenuText}>{choice.label}</span>
            </Item>
          ))}
        </Submenu>
        {atomPropertiesForSubMenu.map(({ title, buttons, key }) => {
          return (
            <Submenu
              {...props}
              label={title}
              data-testid={`${title}-option`}
              key={key}
              className={styles.sameGroup}
            >
              <ButtonGroup<AtomAllAttributeValue>
                buttons={buttons}
                defaultValue={getPropertyValue(key)}
                title={title}
                onClick={(value: AtomAllAttributeValue) =>
                  updateAtomProperty(key, value)
                }
              />
            </Submenu>
          );
        })}
      </Submenu>
      <HighlightMenu
        onHighlight={highlightAtomWithColor}
        disabled={disabledForMonomerCreation}
      />
      <MenuSeparator />
      <Item {...props} data-testid="Delete-option" onClick={handleDelete}>
        <Icon name="deleteMenu" className={styles.icon} />
        <span className={styles.contextMenuText}>
          {i18n.t('contextMenu.delete')}
        </span>
      </Item>
    </>
  );
};

export default AtomMenuItems;
