import i18n, { resources } from './i18n';

describe('legacy translation fallback', () => {
  it('resolves legacy keys in English and Chinese resource sets', async () => {
    const previousLanguage = i18n.language;
    await i18n.changeLanguage('en');
    expect(i18n.t('dialog.cancel')).toBe('Cancel');
    expect(i18n.t('sgroup.repeatCount')).toBe('Repeat count');
    expect(
      i18n.t('dialogs:infoModal.defaultCutCopyMessage', {
        command: 'Cut',
      }),
    ).toBe(
      'This action is unavailable via menu. Instead, use shortcut to Cut.',
    );

    const chineseResources = resources['zh-CN'];
    if (!chineseResources) return;

    expect(chineseResources.legacy.dialog.cancel).toBe('取消');

    try {
      await i18n.changeLanguage('zh-CN');
      expect(i18n.t('dialog.cancel')).toBe('取消');
      expect(i18n.t('open.pasteFromClipboard')).toBe('从剪贴板粘贴');
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});

describe('fork language defaults', () => {
  const previousFlag = process.env.KETCHER_MULTI_LANGUAGE_BUILD;

  afterEach(() => {
    if (previousFlag === undefined)
      delete process.env.KETCHER_MULTI_LANGUAGE_BUILD;
    else process.env.KETCHER_MULTI_LANGUAGE_BUILD = previousFlag;
    localStorage.removeItem('ketcher-language');
  });

  it('includes Chinese and starts in Chinese when no preference is saved', () => {
    delete process.env.KETCHER_MULTI_LANGUAGE_BUILD;
    localStorage.removeItem('ketcher-language');
    jest.isolateModules(() => {
      const {
        default: freshI18n,
        resources: freshResources,
      } = require('./i18n');
      expect(freshResources['zh-CN']).toBeDefined();
      expect(freshI18n.language).toBe('zh-CN');
      expect(freshI18n.t('dialog.cancel')).toBe('取消');
    });
  });

  it('honors a supported saved preference and the English-only build flag', () => {
    process.env.KETCHER_MULTI_LANGUAGE_BUILD = 'true';
    localStorage.setItem('ketcher-language', 'en');
    jest.isolateModules(() => {
      const { default: freshI18n } = require('./i18n');
      expect(freshI18n.language).toBe('en');
    });
    process.env.KETCHER_MULTI_LANGUAGE_BUILD = 'false';
    localStorage.setItem('ketcher-language', 'zh-CN');
    jest.isolateModules(() => {
      const {
        default: freshI18n,
        resources: freshResources,
      } = require('./i18n');
      expect(freshResources['zh-CN']).toBeUndefined();
      expect(freshI18n.language).toBe('en');
    });
  });
});
