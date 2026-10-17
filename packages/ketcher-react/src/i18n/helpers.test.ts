import i18n from './index';
import { translateErrorMessage, translateErrorTitle } from './helpers';

describe('error modal translations', () => {
  const initialLanguage = i18n.language;

  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    await i18n.changeLanguage(initialLanguage);
  });

  it('translates known error titles and preserves unknown titles', () => {
    expect(translateErrorTitle('Error Message')).toBe('错误信息');
    expect(translateErrorTitle('Error')).toBe('错误');
    expect(translateErrorTitle('Monomer library conversion failed')).toBe(
      '单体库转换失败',
    );
    expect(translateErrorTitle('Monomer library update failed')).toBe(
      '单体库更新失败',
    );
    expect(translateErrorTitle('Unsupported symbols')).toBe('不支持的符号');
    expect(translateErrorTitle()).toBe('错误信息');
    expect(translateErrorTitle('backend failure')).toBe('backend failure');
  });

  it('translates known core errors and preserves unknown errors', () => {
    expect(translateErrorMessage('Cannot export image')).toBe('无法导出图片');
    expect(
      translateErrorMessage(
        'It is impossible to merge fragments. Attachment point to establish bonds are not available.',
      ),
    ).toBe('无法合并片段，因为没有可用于建立连接的连接点。');
    expect(translateErrorMessage('backend failure')).toBe('backend failure');
    expect(translateErrorMessage('Failed to load monomers library')).toBe(
      '加载单体库失败',
    );
  });

  it('translates conversion prefixes and keeps unknown diagnostic details', () => {
    expect(translateErrorMessage('Convert error! Cannot export image')).toBe(
      '转换错误！无法导出图片',
    );
    expect(translateErrorMessage('Convert error! backend failure')).toBe(
      '转换错误！backend failure',
    );
    expect(translateErrorMessage()).toBe('');
  });

  it('uses the selected language instead of hardcoded Chinese', async () => {
    await i18n.changeLanguage('en');
    expect(translateErrorTitle('Error')).toBe('Error');
    expect(translateErrorTitle('Monomer library update failed')).toBe(
      'Monomer library update failed',
    );
    expect(translateErrorMessage('Convert error! Cannot export image')).toBe(
      'Convert error! Cannot export image',
    );
  });
});
