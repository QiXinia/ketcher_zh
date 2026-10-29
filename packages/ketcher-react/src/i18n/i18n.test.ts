import i18n, { resources } from './i18n';

describe('legacy translation fallback', () => {
  it('resolves legacy keys in English and Chinese resource sets', async () => {
    expect(i18n.t('dialog.cancel')).toBe('Cancel');
    expect(i18n.t('sgroup.repeatCount')).toBe('Repeat count');
    expect(
      i18n.t('dialogs:infoModal.defaultCutCopyMessage', {
        command: 'Cut',
      }),
    ).toBe('This action is unavailable via menu. Instead, use shortcut to Cut.');

    const chineseResources = resources['zh-CN'];
    if (!chineseResources) return;

    expect(chineseResources.legacy.dialog.cancel).toBe('取消');
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage('zh-CN');
      expect(i18n.t('dialog.cancel')).toBe('取消');
      expect(i18n.t('open.pasteFromClipboard')).toBe('从剪贴板粘贴');
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
