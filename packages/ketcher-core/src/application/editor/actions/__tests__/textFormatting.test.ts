import { formatLexicalText } from '../textFormatting';

function state(text = 'H2O') {
  return JSON.stringify({
    root: {
      type: 'root',
      children: [{
        type: 'paragraph',
        format: '',
        children: [{ type: 'text', text, format: 0, style: '' }],
      }],
    },
  });
}

describe('text formatting actions', () => {
  it('applies and toggles underline in the Lexical format mask', () => {
    const underlined = JSON.parse(formatLexicalText(state('label'), 'underline'));
    expect(underlined.root.children[0].children[0].format).toBe(8);
    const plain = JSON.parse(formatLexicalText(JSON.stringify(underlined), 'underline'));
    expect(plain.root.children[0].children[0].format).toBe(0);
  });

  it('interprets formula digits and charge signs as sub/superscript parts', () => {
    const interpreted = JSON.parse(formatLexicalText(state('H2O+'), 'formula'));
    expect(interpreted.root.children[0].children.map((child: any) => [child.text, child.format])).toEqual([
      ['H', 0],
      ['2', 32],
      ['O', 0],
      ['+', 64],
    ]);
  });

  it('keeps hydrate coefficients and reaction operators at baseline', () => {
    const interpreted = JSON.parse(formatLexicalText(state('Ca(OH)2·5H2O + 2H2O'), 'formula'));
    expect(interpreted.root.children[0].children.map((child: any) => [child.text, child.format])).toEqual([
      ['Ca(OH)', 0],
      ['2', 32],
      ['·5H', 0],
      ['2', 32],
      ['O + 2H', 0],
      ['2', 32],
      ['O', 0],
    ]);
  });

  it('interprets explicit isotope and charge caret notation as superscript', () => {
    const interpreted = JSON.parse(formatLexicalText(state('^{13}CH4 Fe^3+'), 'formula'));
    expect(interpreted.root.children[0].children.map((child: any) => [child.text, child.format])).toEqual([
      ['13', 64],
      ['CH', 0],
      ['4', 32],
      [' Fe', 0],
      ['3+', 64],
    ]);
  });

  it('formats ionic charges but leaves reaction plus signs at baseline', () => {
    const interpreted = JSON.parse(formatLexicalText(state('Na+ + Cl−'), 'formula'));
    expect(interpreted.root.children[0].children.map((child: any) => [child.text, child.format])).toEqual([
      ['Na', 0],
      ['+', 64],
      [' + Cl', 0],
      ['−', 64],
    ]);
  });

  it('stores paragraph alignment and line spacing in the serialized editor state', () => {
    const aligned = JSON.parse(formatLexicalText(state('two lines'), 'alignment', 'center'));
    expect(aligned.root.children[0].format).toBe('center');
    const spaced = JSON.parse(formatLexicalText(JSON.stringify(aligned), 'line-spacing', 1.5));
    expect(spaced.root.children[0].lineSpacing).toBe(1.5);
  });

  it('applies font size and family, then clears both with plain formatting', () => {
    const sized = JSON.parse(formatLexicalText(state('caption'), 'font-size', 24));
    const font = JSON.parse(formatLexicalText(JSON.stringify(sized), 'font-family', 'Arial'));
    expect(font.root.children[0].children[0]).toMatchObject({ style: 'font-size: 24px', font: 'Arial' });

    const plain = JSON.parse(formatLexicalText(JSON.stringify(font), 'plain'));
    expect(plain.root.children[0].children[0]).toMatchObject({ style: '' });
    expect(plain.root.children[0].children[0].font).toBeUndefined();
  });
});
